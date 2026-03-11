// Seismic Rock Acquisition Optimizer
class SeismicAnalyzer {
    constructor() {
        this.yieldChart = null;
        this.qualityChart = null;
        this.initEventListeners();
    }

    initEventListeners() {
        document.getElementById('analyzeBtn').addEventListener('click', () => this.analyze());
        // Real-time analysis on input change
        document.querySelectorAll('input, select').forEach(element => {
            element.addEventListener('change', () => this.analyze());
        });
    }

    analyze() {
        const params = {
            magnitude: parseFloat(document.getElementById('magnitude').value),
            depth: parseFloat(document.getElementById('depth').value),
            distance: parseFloat(document.getElementById('distance').value),
            rockType: document.getElementById('rockType').value,
            timeWindow: parseFloat(document.getElementById('timeWindow').value),
            temperature: parseFloat(document.getElementById('temperature').value)
        };

        const results = this.calculateOptimalAcquisition(params);
        this.displayResults(results);
        this.updateCharts(results);
        this.generateRecommendations(results, params);
        this.generateTimeline(results);
        this.displayDetailedMetrics(results);
    }

    calculateOptimalAcquisition(params) {
        // Energy calculation based on Richter scale
        // Energy (joules) = 10^(1.5*magnitude + 4.8)
        const energy = Math.pow(10, 1.5 * params.magnitude + 4.8);
        
        // Base yield calculation (tons)
        const baseYield = (energy / 1e15) * 1000;
        
        // Optimal time window (minutes after event)
        // Lower magnitudes need less time, deeper earthquakes need more time
        const optimalTime = Math.max(
            15,
            Math.min(
                240,
                30 + (params.depth / 10) - (params.magnitude * 3)
            )
        );

        // Quality score affected by multiple factors
        let qualityScore = 100;
        
        // Distance factor
        const distanceFactor = Math.max(0.3, 1 - (params.distance / 500));
        qualityScore *= distanceFactor;
        
        // Depth factor (optimal at 20-80km)
        const depthOptimal = 50;
        const depthDiff = Math.abs(params.depth - depthOptimal);
        const depthFactor = Math.max(0.4, 1 - (depthDiff / 100));
        qualityScore *= depthFactor;
        
        // Temperature factor
        const tempOptimal = 15;
        const tempDiff = Math.abs(params.temperature - tempOptimal);
        const tempFactor = Math.max(0.5, 1 - (tempDiff / 50));
        qualityScore *= tempFactor;
        
        // Rock type factor
        const rockTypeQuality = {
            granite: 0.95,
            basalt: 0.92,
            limestone: 0.85,
            sandstone: 0.78,
            shale: 0.70
        };
        qualityScore *= rockTypeQuality[params.rockType] || 0.8;
        
        qualityScore = Math.round(qualityScore);

        // Risk assessment
        let riskLevel = 'Low';
        let riskScore = 0;
        
        if (params.magnitude >= 7.5) riskScore += 40;
        else if (params.magnitude >= 6.5) riskScore += 25;
        else if (params.magnitude >= 5.5) riskScore += 10;
        
        if (params.depth < 20) riskScore += 20;
        if (params.distance < 50) riskScore += 15;
        
        if (riskScore >= 50) riskLevel = 'Critical';
        else if (riskScore >= 35) riskLevel = 'High';
        else if (riskScore >= 20) riskLevel = 'Moderate';

        // Maximum yield calculation
        const maxYield = Math.round(baseYield * (qualityScore / 100) * 10) / 10;

        // Aftershock probability (decreases over time)
        const aftershockProb = (t) => {
            return Math.max(0.05, 0.8 * Math.exp(-0.05 * t));
        };

        // Yield efficiency over time
        const efficiencyOverTime = [];
        for (let t = 0; t <= params.timeWindow; t += 5) {
            const efficiency = (maxYield / baseYield) * (1 - Math.exp(-0.03 * t)) * (1 - aftershockProb(t) * 0.3);
            efficiencyOverTime.push({
                time: t,
                yield: Math.round(efficiency * baseYield * 10) / 10,
                aftershockRisk: Math.round(aftershockProb(t) * 100)
            });
        }

        return {
            optimalTime: Math.round(optimalTime),
            maxYield,
            qualityScore,
            riskLevel,
            energy,
            baseYield: Math.round(baseYield * 10) / 10,
            efficiencyOverTime,
            aftershockProb: (t) => aftershockProb(t),
            distanceFactor: Math.round(distanceFactor * 100),
            depthFactor: Math.round(depthFactor * 100),
            tempFactor: Math.round(tempFactor * 100)
        };
    }

    displayResults(results) {
        document.getElementById('optimalTime').textContent = `${results.optimalTime} min`;
        document.getElementById('maxYield').textContent = `${results.maxYield.toLocaleString()}`;
        document.getElementById('qualityScore').textContent = `${results.qualityScore}%`;
        document.getElementById('riskLevel').textContent = results.riskLevel;
    }

    displayDetailedMetrics(results) {
        document.getElementById('baseEnergy').textContent = `${(results.energy / 1e15).toFixed(2)} × 10¹⁵ Joules`;
        document.getElementById('baseYield').textContent = `${results.baseYield.toLocaleString()} tons`;
        document.getElementById('distanceImpact').textContent = `${results.distanceFactor}%`;
        document.getElementById('depthOptimization').textContent = `${results.depthFactor}%`;
        document.getElementById('tempImpact').textContent = `${results.tempFactor}%`;
    }

    updateCharts(results) {
        const ctx1 = document.getElementById('yieldChart').getContext('2d');
        const ctx2 = document.getElementById('qualityChart').getContext('2d');

        const timeData = results.efficiencyOverTime.map(d => d.time);
        const yieldData = results.efficiencyOverTime.map(d => d.yield);
        const aftershockData = results.efficiencyOverTime.map(d => d.aftershockRisk);

        // Destroy existing charts
        if (this.yieldChart) this.yieldChart.destroy();
        if (this.qualityChart) this.qualityChart.destroy();

        // Yield over time chart
        this.yieldChart = new Chart(ctx1, {
            type: 'line',
            data: {
                labels: timeData.map(t => `${t}m`),
                datasets: [{
                    label: 'Rock Yield (tons)',
                    data: yieldData,
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 5,
                    pointBackgroundColor: '#667eea',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: true,
                        labels: {
                            color: '#555',
                            font: {
                                size: 12,
                                weight: 'bold'
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: '#666'
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        }
                    },
                    x: {
                        ticks: {
                            color: '#666'
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        }
                    }
                }
            }
        });

        // Aftershock risk chart
        this.qualityChart = new Chart(ctx2, {
            type: 'bar',
            data: {
                labels: timeData.map(t => `${t}m`),
                datasets: [{
                    label: 'Aftershock Risk (%)',
                    data: aftershockData,
                    backgroundColor: 'rgba(244, 63, 94, 0.7)',
                    borderColor: '#f03f5e',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: true,
                        labels: {
                            color: '#555',
                            font: {
                                size: 12,
                                weight: 'bold'
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            color: '#666'
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        }
                    },
                    x: {
                        ticks: {
                            color: '#666'
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        }
                    }
                }
            }
        });
    }

    generateRecommendations(results, params) {
        const recommendations = [];

        // Timing recommendation
        if (results.optimalTime < 30) {
            recommendations.push('⚡ Act quickly - optimal acquisition window opens within 30 minutes');
        } else if (results.optimalTime < 120) {
            recommendations.push('⏱️ Begin preparations immediately for acquisition within 2 hours');
        } else {
            recommendations.push('📋 Extended window available - careful planning possible');
        }

        // Risk-based recommendation
        if (results.riskLevel === 'Critical') {
            recommendations.push('⚠️ Critical risk level - prioritize safety protocols and use remote equipment');
        } else if (results.riskLevel === 'High') {
            recommendations.push('🛡️ High risk detected - deploy all safety measures and backup teams');
        } else if (results.riskLevel === 'Moderate') {
            recommendations.push('✅ Moderate risk - proceed with standard precautions');
        } else {
            recommendations.push('🟢 Low risk level - optimal conditions for operations');
        }

        // Yield optimization
        if (results.maxYield > 10000) {
            recommendations.push('💰 High yield potential - maximize equipment deployment for this event');
        }

        // Quality consideration
        if (results.qualityScore >= 85) {
            recommendations.push('💎 Excellent material quality - prioritize careful extraction for premium product');
        } else if (results.qualityScore < 60) {
            recommendations.push('⚙️ Lower quality expected - adjust processing protocols accordingly');
        }

        // Distance factor
        if (params.distance < 50) {
            recommendations.push('🎯 Close to epicenter - severe structural impact expected');
        } else if (params.distance > 300) {
            recommendations.push('📍 Far from epicenter - less intensive fragmentation');
        }

        // Environmental
        if (Math.abs(params.temperature - 15) > 30) {
            recommendations.push('🌡️ Extreme temperature conditions - adjust equipment cooling/heating');
        }

        const recList = document.getElementById('recommendations');
        recList.innerHTML = recommendations.map(rec => `<li>${rec}</li>`).join('');
    }

    generateTimeline(results) {
        const timeline = document.getElementById('timeline');
        const milestones = [
            {
                time: '0 min',
                description: 'Seismic event detected',
                type: 'event'
            },
            {
                time: `${Math.max(1, results.optimalTime - 10)} min`,
                description: 'Begin equipment mobilization',
                type: 'preparation'
            },
            {
                time: `${results.optimalTime} min`,
                description: 'OPTIMAL ACQUISITION START',
                type: 'optimal'
            },
            {
                time: `${results.optimalTime + 20} min`,
                description: 'Peak efficiency window',
                type: 'optimal'
            },
            {
                time: `${results.optimalTime + 45} min`,
                description: 'Begin tapering operations',
                type: 'wind-down'
            },
            {
                time: `${results.optimalTime + 60} min`,
                description: 'Conclude primary acquisition',
                type: 'wind-down'
            }
        ];

        timeline.innerHTML = milestones.map(milestone => `
            <div class="timeline-item ${milestone.type === 'optimal' ? 'optimal' : ''}">
                <div class="timeline-time">${milestone.time}</div>
                <div class="timeline-content">${milestone.description}</div>
            </div>
        `).join('');
    }
}

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new SeismicAnalyzer();
    // Trigger initial analysis
    document.getElementById('analyzeBtn').click();
});
