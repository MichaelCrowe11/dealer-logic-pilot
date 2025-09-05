#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
require('dotenv').config();

class DealerLogicValidator {
    constructor() {
        this.configDir = path.join(__dirname, '..', 'config');
        this.validationResults = {
            passed: [],
            failed: [],
            warnings: []
        };
    }

    async validate() {
        console.log('🔍 Dealer Logic Configuration Validator');
        console.log('=======================================\n');

        try {
            // Run all validation checks
            await this.validateEnvironmentVariables();
            await this.validatePhoneNumbers();
            await this.validateAgentConfiguration();
            await this.validateToolEndpoints();
            await this.validateBusinessHours();
            await this.validateCompliance();
            await this.validateIntegrations();
            
            // Generate report
            this.generateValidationReport();
            
        } catch (error) {
            console.error('❌ Validation failed:', error.message);
            process.exit(1);
        }
    }

    validateEnvironmentVariables() {
        console.log('1. Validating Environment Variables');
        console.log('------------------------------------');
        
        const categories = {
            'Dealer Info': ['DEALER_NAME', 'DEALER_ADDRESS', 'DEALER_PHONE', 'DEALER_WEBSITE'],
            'Phone Numbers': ['MAIN_NUMBER', 'SALES_NUMBER', 'SERVICE_NUMBER', 'PARTS_NUMBER'],
            'SIP Configuration': ['SIP_PROVIDER', 'SIP_INGRESS_HOST', 'SIP_EGRESS_HOST'],
            'Voice Configuration': ['VOICE_ID_EN'],
            'CRM Integration': ['CRM_TYPE', 'ADF_INBOX_EMAIL']
        };

        for (const [category, vars] of Object.entries(categories)) {
            console.log(`\n  ${category}:`);
            for (const varName of vars) {
                const value = process.env[varName];
                if (!value) {
                    console.log(`    ✗ ${varName}: MISSING`);
                    this.validationResults.failed.push(`Missing: ${varName}`);
                } else {
                    console.log(`    ✓ ${varName}: Configured`);
                    this.validationResults.passed.push(`${varName} configured`);
                }
            }
        }
    }

    validatePhoneNumbers() {
        console.log('\n2. Validating Phone Numbers');
        console.log('---------------------------');
        
        const phoneVars = ['MAIN_NUMBER', 'SALES_NUMBER', 'SERVICE_NUMBER', 'PARTS_NUMBER'];
        const phoneRegex = /^\d{10}$/;
        
        for (const varName of phoneVars) {
            const value = process.env[varName];
            if (value) {
                if (phoneRegex.test(value)) {
                    console.log(`  ✓ ${varName}: Valid format (${value})`);
                    this.validationResults.passed.push(`${varName} format valid`);
                } else {
                    console.log(`  ✗ ${varName}: Invalid format (expected 10 digits, got: ${value})`);
                    this.validationResults.failed.push(`${varName} invalid format`);
                }
            }
        }

        // Check for duplicates
        const phoneNumbers = phoneVars.map(v => process.env[v]).filter(Boolean);
        const uniqueNumbers = [...new Set(phoneNumbers)];
        
        if (phoneNumbers.length !== uniqueNumbers.length) {
            console.log('  ⚠️  Warning: Duplicate phone numbers detected');
            this.validationResults.warnings.push('Duplicate phone numbers detected');
        }
    }

    async validateAgentConfiguration() {
        console.log('\n3. Validating Agent Configuration');
        console.log('----------------------------------');
        
        const agentsPath = path.join(this.configDir, 'agents.json');
        const agentsContent = fs.readFileSync(agentsPath, 'utf-8');
        const agentsConfig = JSON.parse(agentsContent);
        
        const requiredAgents = [
            'agent.reception',
            'agent.sales',
            'agent.service',
            'agent.parts',
            'agent.after_hours'
        ];
        
        for (const requiredId of requiredAgents) {
            const agent = agentsConfig.agents.find(a => a.id === requiredId);
            if (agent) {
                console.log(`  ✓ ${requiredId}: Configured`);
                this.validationResults.passed.push(`Agent ${requiredId} configured`);
                
                // Validate agent has required fields
                if (!agent.system_prompt) {
                    console.log(`    ⚠️  Missing system prompt`);
                    this.validationResults.warnings.push(`${requiredId} missing system prompt`);
                }
                
                if (!agent.tools || agent.tools.length === 0) {
                    console.log(`    ⚠️  No tools configured`);
                    this.validationResults.warnings.push(`${requiredId} has no tools`);
                }
            } else {
                console.log(`  ✗ ${requiredId}: Not found`);
                this.validationResults.failed.push(`Agent ${requiredId} not found`);
            }
        }
        
        console.log(`\n  Total agents configured: ${agentsConfig.agents.length}`);
    }

    async validateToolEndpoints() {
        console.log('\n4. Validating Tool Endpoints');
        console.log('-----------------------------');
        
        const toolsPath = path.join(this.configDir, 'tools.json');
        const toolsContent = fs.readFileSync(toolsPath, 'utf-8');
        const toolsConfig = JSON.parse(toolsContent);
        
        const criticalTools = [
            'createLead',
            'scheduleService',
            'getInventory',
            'sendSMS',
            'transfer'
        ];
        
        for (const toolName of criticalTools) {
            const tool = toolsConfig.tools.find(t => t.name === toolName);
            if (tool) {
                const urlVar = tool.endpoint.url.match(/\{\{([A-Z_]+)\}\}/);
                if (urlVar) {
                    const envValue = process.env[urlVar[1]];
                    if (envValue) {
                        console.log(`  ✓ ${toolName}: Endpoint configured`);
                        this.validationResults.passed.push(`Tool ${toolName} configured`);
                    } else {
                        console.log(`  ✗ ${toolName}: Endpoint not configured (missing ${urlVar[1]})`);
                        this.validationResults.failed.push(`Tool ${toolName} endpoint missing`);
                    }
                } else {
                    console.log(`  ✓ ${toolName}: Static endpoint`);
                    this.validationResults.passed.push(`Tool ${toolName} configured`);
                }
            } else {
                console.log(`  ✗ ${toolName}: Not defined`);
                this.validationResults.failed.push(`Tool ${toolName} not defined`);
            }
        }
    }

    validateBusinessHours() {
        console.log('\n5. Validating Business Hours');
        console.log('-----------------------------');
        
        const hoursVars = ['HOURS_SALES', 'HOURS_SERVICE', 'HOURS_PARTS'];
        
        for (const varName of hoursVars) {
            const value = process.env[varName];
            if (value) {
                console.log(`  ✓ ${varName}: ${value}`);
                this.validationResults.passed.push(`${varName} configured`);
            } else {
                console.log(`  ⚠️  ${varName}: Not configured`);
                this.validationResults.warnings.push(`${varName} not configured`);
            }
        }
    }

    validateCompliance() {
        console.log('\n6. Validating Compliance Settings');
        console.log('----------------------------------');
        
        const configPath = path.join(this.configDir, 'dealer-logic-config.json');
        const configContent = fs.readFileSync(configPath, 'utf-8');
        const config = JSON.parse(configContent);
        
        // Check recording notice
        if (config.privacy.recording_notice) {
            console.log('  ✓ Recording notice configured');
            this.validationResults.passed.push('Recording notice configured');
        } else {
            console.log('  ✗ Recording notice missing');
            this.validationResults.failed.push('Recording notice missing');
        }
        
        // Check data retention
        const retentionDays = process.env.DATA_RETENTION_DAYS || config.privacy.data_retention_days;
        console.log(`  ✓ Data retention: ${retentionDays} days`);
        
        // Check zero retention mode
        const zeroRetention = process.env.ZERO_RETENTION_MODE === 'true';
        if (zeroRetention) {
            console.log('  ⚠️  Zero retention mode enabled');
            this.validationResults.warnings.push('Zero retention mode enabled');
        }
        
        // Check compliance scripts
        if (config.compliance) {
            const scripts = ['call_opening', 'sms_opt_in_script', 'dnc_phrase', 'payment_rule'];
            for (const script of scripts) {
                if (config.compliance[script]) {
                    console.log(`  ✓ ${script}: Configured`);
                    this.validationResults.passed.push(`${script} configured`);
                } else {
                    console.log(`  ✗ ${script}: Missing`);
                    this.validationResults.failed.push(`${script} missing`);
                }
            }
        }
    }

    validateIntegrations() {
        console.log('\n7. Validating Integrations');
        console.log('---------------------------');
        
        // CRM validation
        const crmType = process.env.CRM_TYPE;
        const adfEmail = process.env.ADF_INBOX_EMAIL;
        
        if (crmType && adfEmail) {
            console.log(`  ✓ CRM: ${crmType} with ADF to ${adfEmail}`);
            this.validationResults.passed.push('CRM integration configured');
        } else {
            console.log('  ✗ CRM integration incomplete');
            this.validationResults.failed.push('CRM integration incomplete');
        }
        
        // Service scheduler validation
        const scheduler = process.env.SCHEDULER;
        if (scheduler) {
            console.log(`  ✓ Service Scheduler: ${scheduler}`);
            this.validationResults.passed.push('Service scheduler configured');
        } else {
            console.log('  ⚠️  Service Scheduler: Not configured');
            this.validationResults.warnings.push('Service scheduler not configured');
        }
        
        // Payment provider validation
        const paymentProvider = process.env.PAYMENTS_PROVIDER;
        if (paymentProvider) {
            console.log(`  ✓ Payment Provider: ${paymentProvider}`);
            this.validationResults.passed.push('Payment provider configured');
        } else {
            console.log('  ⚠️  Payment Provider: Not configured');
            this.validationResults.warnings.push('Payment provider not configured');
        }
    }

    generateValidationReport() {
        console.log('\n\n========================================');
        console.log('         VALIDATION SUMMARY');
        console.log('========================================\n');
        
        const total = this.validationResults.passed.length + 
                     this.validationResults.failed.length;
        
        console.log(`✓ Passed:   ${this.validationResults.passed.length}/${total}`);
        console.log(`✗ Failed:   ${this.validationResults.failed.length}/${total}`);
        console.log(`⚠ Warnings: ${this.validationResults.warnings.length}`);
        
        if (this.validationResults.failed.length > 0) {
            console.log('\nFailed Checks:');
            this.validationResults.failed.forEach(f => console.log(`  - ${f}`));
        }
        
        if (this.validationResults.warnings.length > 0) {
            console.log('\nWarnings:');
            this.validationResults.warnings.forEach(w => console.log(`  - ${w}`));
        }
        
        // Save report
        const reportPath = path.join(__dirname, '..', 'reports', `validation-${Date.now()}.json`);
        fs.mkdirSync(path.dirname(reportPath), { recursive: true });
        fs.writeFileSync(reportPath, JSON.stringify(this.validationResults, null, 2));
        
        console.log(`\n📊 Validation report saved to: ${reportPath}`);
        
        // Exit with appropriate code
        if (this.validationResults.failed.length > 0) {
            console.log('\n❌ Validation failed. Please fix the issues above before deployment.');
            process.exit(1);
        } else if (this.validationResults.warnings.length > 0) {
            console.log('\n⚠️  Validation passed with warnings. Review warnings before deployment.');
        } else {
            console.log('\n✅ All validations passed! Ready for deployment.');
        }
    }
}

// Run validation
if (require.main === module) {
    const validator = new DealerLogicValidator();
    validator.validate();
}