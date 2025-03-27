# Pulumi Nginx Deployment with Autoscaling

## Overview
This Pulumi typescript code provisions Nginx deployment on Kubernetes(minikube) with autoscaling, service , and ingress routing. The setup includes a Horizontal Pod Autoscaler (HPA) to adjust replica counts based on CPU usage. Also, it integrates necessary Kubernetes add-ons like Metrics Server and Ingress Controller to facilitate monitoring and external access.

## Components Included
- **Deployment:**
  - Deploys Nginx with 3 replicas initially.
  - Configured with CPU and memory resource limits.
- **Horizontal Pod Autoscaler (HPA):**
  - Scales the deployment from **3 to 9 replicas based on the CPU utilization goes beyond 50%**.
  - Uses CPU utilization as the metric.
- **Service:**
  - Exposes the Nginx deployment within the cluster using a **ClusterIP**.
- **Ingress:**
  - Routes traffic to the Nginx service.
  - Uses an **Ingress Controller** for external access.
- **Kubernetes Add-ons:**
  - **Metrics Server:** Provides resource usage metrics for autoscaling.
  - **Ingress :** Manages incoming traffic to services.

## Prerequisites
Below are the following that needs to be installed:
- [Pulumi CLI](https://www.pulumi.com/docs/install/)
- [Node.js](https://nodejs.org/)
- A running Kubernetes cluster in this case Minikube
- Loading the kubeconfig for the cluster

## Deployment Instructions


1. **Set up Pulumi stack:**
   ```sh
   pulumi stack init dev
   ```

2. **Configure Kubernetes provider:**
   ```sh
   pulumi config set pulumi-nginx:kubeconfig "$(cat ~/.kube/config)"
   ```

3. **Deploy the resources:**
   ```sh
   pulumi up 
   ```

4. **Verify Deployment:**
   ```sh
   kubectl get deployment nginx -n app-namespace
   kubectl get svc -n app-namespace
   kubectl get ingress -n app-namespace
   kubectl get deployment -n kube-system metrics-server
   kubectl get pods -n app-namespace
   ```

## Obtaining Metrics
After deployment, to retrieve the resource usage metrics using:
```sh
kubectl top pods -n app-namespace
kubectl top nodes
```
To check HPA status:
```sh
kubectl get hpa -n app-namespace
kubectl describe hpa -n app-namespace nginx-hpa
```

## Cleanup
To delete all deployed resources:
```sh
pulumi destroy
pulumi stack rm dev
```

## Conclusion
This setup ensures a robust, autoscalable, and accessible Nginx deployment on Kubernetes. By integrating necessary Kubernetes add-ons, it enables seamless monitoring, and traffic management.
