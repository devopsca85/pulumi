
import * as pulumi from "@pulumi/pulumi";
import * as resources from "@pulumi/azure-native/resources";
import * as network from "@pulumi/azure-native/network";
import * as containerservice from "@pulumi/azure-native/containerservice";
import * as compute from "@pulumi/azure-native/compute";
import * as azure from "@pulumi/azure-nextgen";

const projCfg = new pulumi.Config();
const config = new pulumi.Config();
const numWorkerNodes = projCfg.getNumber("numWorkerNodes") || 3;
const k8sVersion = projCfg.get("kubernetesVersion") || "1.26.3";
const prefixForDns = projCfg.get("prefixForDns") || "pulumi";
const nodeVmSize = projCfg.get("nodeVmSize") || "Standard_DS2_v2";
// The next two configuration values are required (no default can be provided)
const mgmtGroupId = projCfg.require("mgmtGroupId");
const sshPubKey = projCfg.require("sshPubKey"); 

// Create a new Azure Resource Group
const resourceGroup = new resources.ResourceGroup("resourceGroup", {});

// Create a new Azure Virtual Network
const virtualNetwork = new network.VirtualNetwork("virtualNetwork", {
    addressSpace: {
        addressPrefixes: ["10.0.0.0/16"],
    },
    resourceGroupName: resourceGroup.name,
});

// Create three subnets in the virtual network
const subnet1 = new network.Subnet("subnet1", {
    addressPrefix: "10.0.0.0/22",
    resourceGroupName: resourceGroup.name,
    virtualNetworkName: virtualNetwork.name,
});

const subnet2 = new network.Subnet("subnet2", {
    addressPrefix: "10.0.4.0/22",
    resourceGroupName: resourceGroup.name,
    virtualNetworkName: virtualNetwork.name,
});

const subnet3 = new network.Subnet("subnet3", {
    addressPrefix: "10.0.8.0/22",
    resourceGroupName: resourceGroup.name,
    virtualNetworkName: virtualNetwork.name,
});

// Create an Azure Kubernetes Cluster
const managedCluster = new containerservice.ManagedCluster("managedCluster", {
    aadProfile: {
        enableAzureRBAC: true,
        managed: true,
        adminGroupObjectIDs: [mgmtGroupId],
        //enablePrivateCluster: true,
    },
    addonProfiles: {},
    // Use multiple agent
    agentPoolProfiles: [{
        availabilityZones: ["1","2","3"],
           // count: numWorkerNodes,
            count: 3,
        enableNodePublicIP: false,
        mode: "System",
        name: "systempool",
        osType: "Linux",
        osDiskSizeGB: 30,
        type: "VirtualMachineScaleSets",
        vmSize: nodeVmSize,
        //  additional node pools to distribute across subnets
        vnetSubnetID: subnet1.id,
        //privateClusterEnabled: true, 
        //apiServerAccessProfile: {
        //enablePrivateCluster: "true",
    //}
       
}
],
    
    
    apiServerAccessProfile: {
        //authorizedIPRanges: ["0.0.0.0/0"],
        enablePrivateCluster: true,
    },
    dnsPrefix: prefixForDns,
    enableRBAC: true,
    identity: {
        type: "SystemAssigned",
    },
    kubernetesVersion: k8sVersion,
    linuxProfile: {
        adminUsername: "azureuser",
        ssh: {
            publicKeys: [{
                keyData: sshPubKey,
            }],
        },
    },
    networkProfile: {
        networkPlugin: "azure",
        networkPolicy: "azure",
        serviceCidr: "10.96.0.0/16",
        dnsServiceIP: "10.96.0.10",
    },
    resourceGroupName: resourceGroup.name,
});


const publicIpAddress = new network.PublicIPAddress("publicIpAddress", {
    resourceGroupName: resourceGroup.name,
    publicIPAllocationMethod: "Dynamic",
});

// Create a network interface for the VM
const vmNetworkInterface = new network.NetworkInterface("vmNetworkInterface", {
    resourceGroupName: resourceGroup.name,
    ipConfigurations: [{
        name: "vm-ip-config",
        subnet: { id: subnet1.id },
        privateIPAllocationMethod: "Dynamic",
        publicIPAddress: { id: publicIpAddress.id },
    }],
});

// Create a virtual machine
const virtualMachine = new compute.VirtualMachine("virtualMachine", {
    resourceGroupName: resourceGroup.name,
    networkProfile: {
        networkInterfaces: [{ id: vmNetworkInterface.id }],
    },
    osProfile: {
        computerName: "jumpserver",
        adminUsername: "jumpserver",
         adminPassword: "jumpserver123!", 
    },
    storageProfile: {
        osDisk: {
            createOption: "FromImage",
            name: "osdisk",
            caching: "ReadWrite",
        },
        imageReference: {
            publisher: "Canonical",
            offer: "UbuntuServer",
            sku: "18.04-LTS",
            version: "latest",
        },
    },
    hardwareProfile: {
        vmSize:  "Standard_B1s", 
    },
});


//  access the cluster
const creds = containerservice.listManagedClusterUserCredentialsOutput({
    resourceGroupName: resourceGroup.name,
    resourceName: managedCluster.name,
});
const encoded = creds.kubeconfigs[0].value;
const decoded = encoded.apply(enc => Buffer.from(enc, "base64").toString());

//  some values for use 
export const rgName = resourceGroup.name;
export const networkName = virtualNetwork.name;
export const clusterName = managedCluster.name;
export const kubeconfig = decoded;
// export const publicIpAddress = publicIp.ipAddress;


// Front Door Premium resource group
const resourceGroupName = config.require("resourceGroupName");

const frontdoor = new azure.frontdoor.FrontDoor("myFrontDoor", {
    resourceGroupName: resourceGroupName,
    frontendEndpoints: [{
        name: "myFrontendEndpoint",
        hostName: "example.com",
    }],
    backendPools: [{
        name: "myBackendPool",
        backends: [{
            address: "backend1.azurewebsites.net",
            httpPort: 80,
            priority: 1,
            weight: 50,
        }],
    }],
    loadBalancingSettings: {
        name: "myLoadBalancingSettings",
        sampleSize: 4,
        successfulSamplesRequired: 2,
    },
    routingRules: [{
        name: "myRoutingRule",
        frontendEndpoints: [{ item: "myFrontendEndpoint" }],
        acceptedProtocols: ["Http"],
        patternsToMatch: [{
            pattern: "/path/*",
        }],
        routeConfiguration: {
            name: "myRouteConfiguration",
            backendPool: { item: "myBackendPool" },
        },
    }],
});

export const frontdoorName = frontdoor.name;