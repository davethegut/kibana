/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DemoAlertInvestigationRule } from './demo_alert_investigation';

interface CatalogRule extends DemoAlertInvestigationRule {
  category: string;
}

const investigationRules: readonly CatalogRule[] = [
  {
    id: 'endpoint',
    label: 'Suspicious PowerShell activity',
    enabled: true,
    alertsLast24h: 48,
    category: 'Windows',
  },
  {
    id: 'cloud',
    label: 'Unexpected cloud access',
    enabled: true,
    alertsLast24h: 17,
    category: 'AWS',
  },
  {
    id: 'identity',
    label: 'Rare service-account sign-in',
    enabled: true,
    alertsLast24h: 31,
    category: 'Identity',
  },
  {
    id: 'network',
    label: 'Potential network beaconing',
    enabled: true,
    alertsLast24h: 0,
    category: 'Network',
  },
  {
    id: 'disabled',
    label: 'Unusual administrative activity',
    enabled: false,
    alertsLast24h: 0,
    category: 'Identity',
  },
];

const ruleGroups: ReadonlyArray<{ category: string; names: readonly string[] }> = [
  {
    category: 'Windows',
    names: [
      'Encoded PowerShell Command',
      'PowerShell Download and Execute',
      'PowerShell Script Block Logging Disabled',
      'Suspicious PowerShell Child Process',
      'Potential LSASS Memory Access',
      'Credential Dumping via Registry Hive Export',
      'Suspicious Scheduled Task Creation',
      'Windows Service Created by an Unusual Process',
      'New Run Key Persistence',
      'Windows Defender Exclusions Modified',
      'Windows Event Log Cleared',
      'Suspicious Remote Service Execution',
      'Unusual PsExec Execution',
      'Remote Desktop Connection from an Unusual Source',
      'WMI Execution with Suspicious Arguments',
      'Suspicious Rundll32 Network Connection',
      'Mshta Execution of Remote Content',
      'Regsvr32 Execution of Remote Script',
      'Certutil Downloading a File',
      'Office Application Spawning a Command Shell',
      'Executable Written to a User Startup Folder',
      'Possible Kerberoasting Activity',
      'Potential DCSync Activity',
      'Suspicious Shadow Copy Deletion',
    ],
  },
  {
    category: 'Linux',
    names: [
      'Linux Reverse Shell Activity',
      'Suspicious Download Followed by Execution',
      'New Linux Cron Job Created',
      'Linux Systemd Service Persistence',
      'Unusual SSH Authorized Keys Modification',
      'Potential SSH Brute Force',
      'Privileged Account Created on Linux',
      'Suspicious Sudoers File Modification',
      'Linux Audit Logging Disabled',
      'Potential Linux Credential File Access',
      'Linux Process Executed from a Temporary Directory',
      'Suspicious History File Deletion',
      'Unusual Outbound Connection by a Shell',
      'Possible Cryptocurrency Miner on Linux',
    ],
  },
  {
    category: 'macOS',
    names: [
      'macOS Launch Agent Persistence',
      'macOS Launch Daemon Persistence',
      'Suspicious macOS Keychain Access',
      'macOS Gatekeeper Bypass Attempt',
      'AppleScript Spawning a Command Shell',
      'macOS Security Tool Disabled',
      'Unusual macOS Configuration Profile Installation',
      'Suspicious macOS Login Item Creation',
    ],
  },
  {
    category: 'Identity',
    names: [
      'Okta Sign-In from a New Country',
      'Okta MFA Factor Reset',
      'Okta Administrative Role Assigned',
      'Okta Suspicious Session Activity',
      'Multiple Failed Logins Followed by Success',
      'Password Spraying Across Multiple Accounts',
      'Privileged Account Sign-In from an Unusual Location',
      'Service Account Interactive Logon',
      'Dormant Account Reactivated',
      'Account Added to a Privileged Group',
      'Unusual Authentication Protocol Usage',
      'Possible Impossible Travel Sign-In',
      'MFA Disabled for a Privileged Account',
      'Unusual Volume of Authentication Failures',
    ],
  },
  {
    category: 'AWS',
    names: [
      'AWS CloudTrail Logging Disabled',
      'AWS IAM Access Key Created',
      'AWS IAM Policy with Administrative Access Created',
      'AWS Root Account Console Login',
      'AWS Console Login without MFA',
      'AWS S3 Bucket Public Access Enabled',
      'AWS S3 Object Download Spike',
      'AWS Security Group Opened to the Internet',
      'AWS GuardDuty Detector Disabled',
      'AWS KMS Key Scheduled for Deletion',
      'AWS Secrets Manager Secret Accessed by an Unusual Principal',
      'AWS EC2 Instance Profile Modified',
      'AWS Role Assumed from an Unusual Source',
      'AWS Lambda Function Permissions Modified',
    ],
  },
  {
    category: 'Azure',
    names: [
      'Azure Sign-In from an Unfamiliar Location',
      'Azure Privileged Role Assignment',
      'Azure Application Consent Granted',
      'Azure Service Principal Credential Added',
      'Azure Conditional Access Policy Disabled',
      'Azure Key Vault Secret Access by an Unusual Principal',
      'Azure Storage Account Public Access Enabled',
      'Azure Network Security Group Modified',
      'Azure Diagnostic Logging Disabled',
      'Azure Virtual Machine Run Command Executed',
      'Azure Subscription Owner Added',
      'Azure Managed Identity Permissions Changed',
    ],
  },
  {
    category: 'Google Cloud',
    names: [
      'GCP Service Account Key Created',
      'GCP IAM Policy Modified',
      'GCP Audit Logging Disabled',
      'GCP Cloud Storage Bucket Made Public',
      'GCP Firewall Rule Allows Public Ingress',
      'GCP Secret Access by an Unusual Service Account',
      'GCP Compute Instance Metadata Modified',
      'GCP Service Account Impersonation from an Unusual Source',
    ],
  },
  {
    category: 'Microsoft 365',
    names: [
      'Microsoft 365 Inbox Forwarding Rule Created',
      'Microsoft 365 Suspicious Inbox Rule',
      'Microsoft 365 Mass File Download',
      'Microsoft 365 Mass File Deletion',
      'Microsoft 365 External Sharing Spike',
      'Microsoft 365 Mailbox Delegation Changed',
      'Microsoft 365 Administrative Audit Logging Disabled',
      'Microsoft 365 eDiscovery Export Created',
      'Microsoft 365 Suspicious OAuth Application Activity',
      'Microsoft 365 Transport Rule Modified',
    ],
  },
  {
    category: 'Network',
    names: [
      'Possible DNS Tunneling Activity',
      'High Volume of NXDOMAIN Responses',
      'Outbound Traffic to a Rare Destination',
      'Large Outbound Data Transfer',
      'Connection to a Known Malicious IP Address',
      'TLS Connection with an Unusual Server Name',
      'Possible Internal Network Port Scan',
      'Unusual SMB Traffic Between Workstations',
      'Possible ICMP Tunneling',
      'Unusual Remote Administration Protocol Usage',
    ],
  },
  {
    category: 'Kubernetes',
    names: [
      'Kubernetes Privileged Container Started',
      'Kubernetes Container Executed as Root',
      'Kubernetes Secret Access by an Unusual Service Account',
      'Kubernetes Cluster Admin Role Binding Created',
      'Kubernetes Pod Executed from an Untrusted Image',
      'Kubernetes Interactive Shell Started in a Container',
      'Kubernetes Audit Policy Modified',
      'Kubernetes Service Account Token Used Externally',
      'Kubernetes Container with Host Filesystem Access',
    ],
  },
];

const noisyRuleVolumes = new Map<number, number>([
  [0, 284],
  [9, 166],
  [25, 92],
  [40, 58],
  [58, 44],
  [74, 36],
  [90, 27],
  [106, 21],
]);

const additionalRules: CatalogRule[] = ruleGroups
  .flatMap(({ category, names }) => names.map((label) => ({ category, label })))
  .map(({ category, label }, index) => {
    const enabled = index % 8 !== 7;
    return {
      id: `sample-${category.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${index + 1}`,
      label,
      category,
      enabled,
      alertsLast24h: enabled
        ? noisyRuleVolumes.get(index) ?? (index % 7 < 4 ? 0 : 1 + ((index * 17) % 19))
        : 0,
    };
  });

/** A fixed, illustrative rule catalog with a long-tail distribution of recent alert volume. */
export const DEMO_DETECTION_RULES: readonly DemoAlertInvestigationRule[] = [
  ...investigationRules,
  ...additionalRules,
];
