#!/usr/bin/env node

const readline = require('readline');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

class DealerLogicTestSuite {
    constructor() {
        this.testResults = [];
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
    }

    async runTests() {
        console.log('🧪 Dealer Logic Test Call Suite');
        console.log('================================\n');
        console.log('This suite will guide you through test calls to validate the deployment.\n');

        const tests = [
            {
                name: 'Reception Agent - Sales Lead',
                number: process.env.MAIN_NUMBER,
                scenario: 'Customer calling about a new vehicle',
                expectedFlow: [
                    'Agent greets and discloses recording',
                    'Agent identifies intent (sales)',
                    'Collects name and phone number',
                    'Asks about vehicle interest',
                    'Creates lead in CRM',
                    'Offers test drive appointment or warm transfer'
                ],
                validationPoints: [
                    'Recording disclosure given',
                    'Intent identified correctly',
                    'Lead created in CRM',
                    'ADF email sent'
                ]
            },
            {
                name: 'Service Scheduler - Oil Change',
                number: process.env.SERVICE_NUMBER,
                scenario: 'Customer needs oil change appointment',
                expectedFlow: [
                    'Agent greets and identifies service need',
                    'Collects VIN or license plate',
                    'Gets mileage and service concern',
                    'Asks about transportation preference',
                    'Checks for recalls',
                    'Books appointment',
                    'Sends confirmation SMS'
                ],
                validationPoints: [
                    'VIN/plate collected',
                    'Appointment created in scheduler',
                    'Recall check performed',
                    'SMS confirmation sent'
                ]
            },
            {
                name: 'Parts Counter - Part Inquiry',
                number: process.env.PARTS_NUMBER,
                scenario: 'Customer needs brake pads for 2020 Honda Accord',
                expectedFlow: [
                    'Agent greets and identifies parts need',
                    'Collects vehicle information (Y/M/M or VIN)',
                    'Gets part description',
                    'Looks up part in catalog',
                    'Provides availability and pickup options',
                    'Creates parts quote',
                    'Collects contact information'
                ],
                validationPoints: [
                    'Part lookup performed',
                    'Quote created',
                    'Contact information captured'
                ]
            },
            {
                name: 'Spanish Language Support',
                number: process.env.MAIN_NUMBER,
                scenario: 'Customer speaks Spanish',
                expectedFlow: [
                    'Customer indicates Spanish preference',
                    'Agent switches to Spanish voice/language',
                    'Continues conversation in Spanish',
                    'Completes task in Spanish'
                ],
                validationPoints: [
                    'Language switch successful',
                    'Spanish voice activated',
                    'Task completed in Spanish'
                ]
            },
            {
                name: 'Service Status Check',
                number: process.env.SERVICE_NUMBER,
                scenario: 'Customer checking on repair status',
                expectedFlow: [
                    'Agent requests RO number or phone',
                    'Authenticates customer',
                    'Provides status update',
                    'If ready, offers payment link',
                    'Sends secure payment link via SMS'
                ],
                validationPoints: [
                    'Authentication successful',
                    'Status retrieved',
                    'Payment link sent (if applicable)'
                ]
            },
            {
                name: 'After Hours Message',
                number: process.env.MAIN_NUMBER,
                scenario: 'Call after business hours',
                expectedFlow: [
                    'After hours agent answers',
                    'Captures caller information',
                    'Records message',
                    'Offers to schedule callback',
                    'Creates voicemail transcription',
                    'Sends digest to managers'
                ],
                validationPoints: [
                    'Message captured',
                    'Voicemail created',
                    'Manager notification sent'
                ]
            },
            {
                name: 'Warm Transfer Test',
                number: process.env.MAIN_NUMBER,
                scenario: 'Complex request requiring human agent',
                expectedFlow: [
                    'Agent attempts to handle request',
                    'Recognizes need for transfer',
                    'Announces transfer to customer',
                    'Performs warm transfer',
                    'Provides context to human agent'
                ],
                validationPoints: [
                    'Transfer initiated correctly',
                    'Context preserved',
                    'Call not dropped'
                ]
            },
            {
                name: 'DNC Request',
                number: process.env.MAIN_NUMBER,
                scenario: 'Customer requests do-not-call',
                expectedFlow: [
                    'Customer requests DNC',
                    'Agent acknowledges request',
                    'Uses compliance script',
                    'Updates DNC status',
                    'Confirms with customer'
                ],
                validationPoints: [
                    'DNC script used',
                    'Status updated in system',
                    'Confirmation provided'
                ]
            }
        ];

        console.log(`Found ${tests.length} test scenarios to execute.\n`);
        
        for (let i = 0; i < tests.length; i++) {
            const test = tests[i];
            console.log(`\n📞 Test ${i + 1}/${tests.length}: ${test.name}`);
            console.log('─'.repeat(50));
            
            await this.executeTest(test);
        }

        await this.generateTestReport();
        this.rl.close();
    }

    async executeTest(test) {
        console.log(`\n📋 Scenario: ${test.scenario}`);
        console.log(`📞 Call Number: ${test.number || 'Not configured'}`);
        console.log('\n🔄 Expected Flow:');
        test.expectedFlow.forEach((step, i) => {
            console.log(`   ${i + 1}. ${step}`);
        });

        console.log('\n✅ Validation Points:');
        test.validationPoints.forEach(point => {
            console.log(`   • ${point}`);
        });

        if (!test.number || test.number.includes('{{')) {
            console.log('\n⚠️  Skipping test - phone number not configured');
            this.testResults.push({
                name: test.name,
                status: 'skipped',
                reason: 'Phone number not configured'
            });
            return;
        }

        const result = await this.promptUser('\n🎯 Execute this test? (y/n/skip): ');
        
        if (result.toLowerCase() === 'skip' || result.toLowerCase() === 'n') {
            this.testResults.push({
                name: test.name,
                status: 'skipped',
                reason: 'User skipped'
            });
            return;
        }

        console.log('\n📞 Please make the test call now...');
        console.log(`   Dial: ${test.number}`);
        console.log('   Follow the scenario described above\n');

        // Collect validation results
        const validationResults = {};
        for (const point of test.validationPoints) {
            const result = await this.promptUser(`   ✓ ${point}? (y/n): `);
            validationResults[point] = result.toLowerCase() === 'y';
        }

        const notes = await this.promptUser('\n📝 Additional notes (optional): ');
        
        const allPassed = Object.values(validationResults).every(v => v === true);
        
        this.testResults.push({
            name: test.name,
            status: allPassed ? 'passed' : 'failed',
            validationResults,
            notes: notes || undefined,
            timestamp: new Date().toISOString()
        });

        console.log(`\n${allPassed ? '✅' : '❌'} Test ${allPassed ? 'passed' : 'failed'}`);
    }

    promptUser(question) {
        return new Promise(resolve => {
            this.rl.question(question, answer => {
                resolve(answer);
            });
        });
    }

    async generateTestReport() {
        console.log('\n\n========================================');
        console.log('          TEST RESULTS SUMMARY');
        console.log('========================================\n');

        const passed = this.testResults.filter(r => r.status === 'passed').length;
        const failed = this.testResults.filter(r => r.status === 'failed').length;
        const skipped = this.testResults.filter(r => r.status === 'skipped').length;

        console.log(`✅ Passed:  ${passed}`);
        console.log(`❌ Failed:  ${failed}`);
        console.log(`⏭️  Skipped: ${skipped}`);
        console.log(`📊 Total:   ${this.testResults.length}`);

        if (failed > 0) {
            console.log('\n❌ Failed Tests:');
            this.testResults
                .filter(r => r.status === 'failed')
                .forEach(r => {
                    console.log(`\n   ${r.name}:`);
                    Object.entries(r.validationResults)
                        .filter(([_, passed]) => !passed)
                        .forEach(([point, _]) => {
                            console.log(`     ✗ ${point}`);
                        });
                });
        }

        // Save report
        const report = {
            timestamp: new Date().toISOString(),
            dealerName: process.env.DEALER_NAME,
            summary: {
                total: this.testResults.length,
                passed,
                failed,
                skipped
            },
            results: this.testResults
        };

        const reportPath = path.join(__dirname, '..', 'reports', `test-results-${Date.now()}.json`);
        fs.mkdirSync(path.dirname(reportPath), { recursive: true });
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

        console.log(`\n📊 Test report saved to: ${reportPath}`);

        if (failed === 0 && passed > 0) {
            console.log('\n🎉 All tests passed! System is ready for production.');
        } else if (failed > 0) {
            console.log('\n⚠️  Some tests failed. Please review and fix issues before go-live.');
        }
    }
}

// Run tests
if (require.main === module) {
    const tester = new DealerLogicTestSuite();
    tester.runTests().catch(console.error);
}