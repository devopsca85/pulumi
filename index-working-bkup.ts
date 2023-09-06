import * as pulumi from "@pulumi/pulumi";
import * as azure from "@pulumi/azure";
import * as network from "@pulumi/azure-native/network";

const config = new pulumi.Config();

// Set your desired configuration values here
const resourceGroupName = config.require("resourceGroupName");
const resourceGroupLocation = config.require("resourceGroupLocation");

const frontdoorProfileName = config.require("frontdoorProfileName");
const frontdoorProfileSkuName = config.require("frontdoorProfileSkuName");
const frontdoorProfileEnvironment = config.require(
  "frontdoorProfileEnvironment"
);

const virtualNetworkName = config.require("virtualNetworkName");
const virtualNetworkAddressPrefix = config.require(
  "virtualNetworkAddressPrefix"
);

const aksSubnetName = config.require("aksSubnetName");
const aksSubnetAddressPrefix = config.require("aksSubnetAddressPrefix");
const vmSubnetName = config.require("vmSubnetName");
const vmSubnetAddressPrefix = config.require("vmSubnetAddressPrefix");

const kcName = config.require("kcName");
const kcDefaultNodePoolName = config.require("kcDefaultNodePoolName");
const kcDefaultNodePoolVmSize = config.require("kcDefaultNodePoolVmSize");
const kcDefaultNodePoolNodeCount = parseInt(config.require("kcDefaultNodePoolNodeCount"));
const kcDnsPrefix = config.require("kcDnsPrefix");
const kcIdentityType = config.require("kcIdentityType");
const kcPrivateClusterEnabled = config.requireBoolean("kcPrivateClusterEnabled");
const kcNetworkProfilePlugin = config.require("kcNetworkProfilePlugin");

const networkInterface = config.require("networkInterface");

const vmName = config.require("vmName");
const vmSize = config.require("vmSize");

const vmStorageImageReferencePublisher = config.require(
  "vmStorageImageReferencePublisher"
);
const vmStorageImageReferenceOffer = config.require(
  "vmStorageImageReferenceOffer"
);
const vmStorageImageReferenceSku = config.require("vmStorageImageReferenceSku");
const vmStorageImageReferenceVersion = config.require(
  "vmStorageImageReferenceVersion"
);

const vmosProfileComputerName = config.require("vmosProfileComputerName");
const vmosProfileAdminUsername = config.require("vmosProfileAdminUsername");
const vmosProfileAdminPassword = config.require("vmosProfileAdminPassword");
const vmosProfiledDisablePasswordAuthentication = config.requireBoolean(
  "vmosProfiledDisablePasswordAuthentication"
);
const vmstorageOsDiskCreateOption = config.require(
  "vmstorageOsDiskCreateOption"
);
const vmstorageOsDiskName = config.require("vmstorageOsDiskName");

//Frontdoor Premium Setup
const resourceGroup = new azure.core.ResourceGroup(resourceGroupName, {
  location: resourceGroupLocation,
});
const frontdoorProfile = new azure.cdn.FrontdoorProfile(frontdoorProfileName, {
  resourceGroupName: resourceGroup.name,
  skuName: frontdoorProfileSkuName,
  tags: {
    environment: frontdoorProfileEnvironment,
  },
});

// Create an Azure Virtual Network
const vnet = new network.VirtualNetwork(virtualNetworkName, {
  addressSpace: {
    addressPrefixes: [virtualNetworkAddressPrefix],
  },
  resourceGroupName: resourceGroup.name,
});

// Create a Subnet for the AKS cluster
const aksSubnet = new network.Subnet(aksSubnetName, {
  addressPrefix: aksSubnetAddressPrefix,
  resourceGroupName: resourceGroup.name,
  virtualNetworkName: vnet.name,
});

// Create a Subnet for the VM
const vmSubnet = new network.Subnet(vmSubnetName, {
  addressPrefix: vmSubnetAddressPrefix,
  resourceGroupName: resourceGroup.name,
  virtualNetworkName: vnet.name,
});

// Create the AKS cluster
const cluster = new azure.containerservice.KubernetesCluster(kcName, {
  resourceGroupName: resourceGroup.name,
  defaultNodePool: {
    name: kcDefaultNodePoolName,
    vmSize: kcDefaultNodePoolVmSize,
    nodeCount: kcDefaultNodePoolNodeCount,
  },
  dnsPrefix: kcDnsPrefix,
  identity: {
    type: kcIdentityType,
  },
  privateClusterEnabled: kcPrivateClusterEnabled,
  networkProfile: {
    networkPlugin: kcNetworkProfilePlugin,
  },
});

// Create a network interface for the VM
const vmNic = new azure.network.NetworkInterface(networkInterface, {
  resourceGroupName: resourceGroup.name,
  ipConfigurations: [
    {
      name: "ipconfig",
      subnetId: vmSubnet.id,
      privateIpAddressAllocation: "Dynamic",
    },
  ],
});

// Create the VM
const vm = new azure.compute.VirtualMachine(vmName, {
  resourceGroupName: resourceGroup.name,
  networkInterfaceIds: [vmNic.id],
  vmSize: vmSize,
  storageImageReference: {
    publisher: vmStorageImageReferencePublisher,
    offer: vmStorageImageReferenceOffer,
    sku: vmStorageImageReferenceSku,
    version: vmStorageImageReferenceVersion,
  },
  osProfile: {
    computerName: vmosProfileComputerName,
    adminUsername: vmosProfileAdminUsername,
    adminPassword: vmosProfileAdminPassword,
  },
  osProfileLinuxConfig: {
    disablePasswordAuthentication: vmosProfiledDisablePasswordAuthentication,
  },
  storageOsDisk: {
    createOption: vmstorageOsDiskCreateOption,
    name: vmstorageOsDiskName,
  },
});
