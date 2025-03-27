import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";

const config = new pulumi.Config();
const kubeconfig = config.require("kubeconfig");

const k8sProvider = new k8s.Provider("k8sProvider", { kubeconfig });

const namespace = new k8s.core.v1.Namespace("app-namespace", {
    metadata: { name: "app-namespace" },
}, { provider: k8sProvider });

const metricsServerDeployment = new k8s.apps.v1.Deployment("metrics-server", {
    metadata: { name: "metrics-server", namespace: "kube-system" },
    spec: {
        selector: { matchLabels: { "k8s-app": "metrics-server" } },
        template: {
            metadata: { labels: { "k8s-app": "metrics-server" } },
            spec: {
                containers: [{
                    name: "metrics-server",
                    image: "registry.k8s.io/metrics-server/metrics-server:v0.6.3",
                    args: [
                        "--cert-dir=/tmp",
                        "--secure-port=443",
                        "--kubelet-preferred-address-types=InternalIP,ExternalIP,Hostname",
                        "--kubelet-use-node-status-port",
                        "--metric-resolution=15s",
                        
                        
                    ],
                    ports: [{ containerPort: 443 }]
                }]
            }
        }
    }
}, { provider: k8sProvider });

const metricsServerService = new k8s.core.v1.Service("metrics-server-service", {
    metadata: { name: "metrics-server", namespace: "kube-system" },
    spec: {
        selector: { "k8s-app": "metrics-server" },
        ports: [{ protocol: "TCP", port: 443, targetPort: 443 }],
    },
}, { provider: k8sProvider, dependsOn: [metricsServerDeployment] });

const metricsApiService = new k8s.apiregistration.v1.APIService("metrics-server-api", {
    metadata: { name: "v1beta1.metrics.k8s.io" },
    spec: {
        service: { name: "metrics-server", namespace: "kube-system" },
        group: "metrics.k8s.io",
        version: "v1beta1",
        insecureSkipTLSVerify: true,
        groupPriorityMinimum: 100,
        versionPriority: 100,
    },
}, { provider: k8sProvider, dependsOn: [metricsServerService] });

const ingressController = new k8s.yaml.ConfigFile("ingress-controller", {
    file: "https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/cloud/deploy.yaml",
}, { provider: k8sProvider });

const appLabels = { app: "nginx" };
const deployment = new k8s.apps.v1.Deployment("nginx-deployment", {
    metadata: { name: "nginx", namespace: namespace.metadata.name },
    spec: {
        selector: { matchLabels: appLabels },
        replicas: 3,
        template: {
            metadata: { labels: appLabels },
            spec: {
                containers: [{
                    name: "nginx",
                    image: "nginx",
                    ports: [{ containerPort: 80 }],
                    resources: {
                        requests: { cpu: "100m", memory: "128Mi" },
                        limits: { cpu: "500m", memory: "256Mi" },
                    },
                }]
            }
        }
    }
}, { provider: k8sProvider });

const service = new k8s.core.v1.Service("nginx-service", {
    metadata: { name: "nginx-service", namespace: namespace.metadata.name },
    spec: {
        selector: appLabels,
        ports: [{ protocol: "TCP", port: 80, targetPort: 80 }],
        type: "ClusterIP"
    }
}, { provider: k8sProvider });

const ingress = new k8s.networking.v1.Ingress("nginx-ingress", {
    metadata: {
        name: "nginx-ingress",
        namespace: namespace.metadata.name,
        annotations: {
            
            
        },
    },
    spec: {
        ingressClassName: "nginx",
        rules: [{
            host: "nginx.local",
            http: {
                paths: [{
                    path: "/",
                    pathType: "Prefix",
                    backend: {
                        service: { name: service.metadata.name, port: { number: 80 } }
                    }
                }]
            }
        }]
    }
}, { provider: k8sProvider, dependsOn: [ingressController] });

const hpa = new k8s.autoscaling.v2.HorizontalPodAutoscaler("nginx-hpa", {
    metadata: { name: "nginx-hpa", namespace: namespace.metadata.name },
    spec: {
        scaleTargetRef: {
            apiVersion: "apps/v1",
            kind: "Deployment",
            name: deployment.metadata.name,
        },
        minReplicas: 3,
        maxReplicas: 9,
        metrics: [{
            type: "Resource",
            resource: { name: "cpu", target: { type: "Utilization", averageUtilization: 50 } }
        }]
    }
}, { provider: k8sProvider, dependsOn: [metricsApiService] });

export const namespaceName = namespace.metadata.name;
export const deploymentName = deployment.metadata.name;
export const serviceName = service.metadata.name;
export const ingressName = ingress.metadata.name;

