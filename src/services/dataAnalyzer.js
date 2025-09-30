const TextAnalyzer = require('../utils/textAnalysis');

class DataAnalyzer {
  constructor(db) {
    this.db = db;
  }

  // นำเข้าข้อมูลจาก Excel พร้อม normalize
  async importRecords(records) {
    const results = {
      success: 0,
      failed: 0,
      errors: []
    };

    // Normalize อาการเสีย
    const symptoms = records.map(r => r.symptom).filter(s => s);
    const symptomClusters = TextAnalyzer.clusterSimilarTexts(symptoms, 0.75);

    // Normalize วิธีแก้ไข
    const fixes = records.map(r => r.how_to_fix).filter(f => f);
    const fixClusters = TextAnalyzer.clusterSimilarTexts(fixes, 0.75);

    // สร้าง mapping
    const symptomMap = new Map();
    symptomClusters.forEach(cluster => {
      cluster.variants.forEach(variant => {
        symptomMap.set(variant, cluster.representative);
      });
    });

    const fixMap = new Map();
    fixClusters.forEach(cluster => {
      cluster.variants.forEach(variant => {
        fixMap.set(variant, cluster.representative);
      });
    });

    // Insert records
    for (const record of records) {
      try {
        const normalizedRecord = {
          machine: record.machine,
          machine_side: record.machine_side,
          symptom: record.symptom,
          symptom_normalized: symptomMap.get(record.symptom) || record.symptom,
          date_failure: record.date_failure,
          time_failure: record.time_failure,
          repairer: record.repairer,
          how_to_fix: record.how_to_fix,
          fix_method_normalized: fixMap.get(record.how_to_fix) || record.how_to_fix
        };

        const maintenanceId = this.db.insertMaintenanceRecord(normalizedRecord);

        // Insert part ถ้ามี
        if (record.part_code && record.name_part) {
          this.db.insertPart(record.part_code, record.name_part);
          this.db.insertPartUsage(
            maintenanceId,
            record.part_code,
            record.court_part || 1,
            record.date_failure
          );
        }

        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          record: record,
          error: error.message
        });
      }
    }

    return results;
  }

  // วิเคราะห์ความถี่การเสีย
  analyzeFailureFrequency(machine, startDate, endDate) {
    const records = this.db.getFailureFrequency(machine, startDate, endDate);

    return records.map(record => {
      const daysInPeriod = this.calculateDaysBetween(startDate, endDate);
      const monthsInPeriod = daysInPeriod / 30;

      return {
        machine: record.machine,
        machine_side: record.machine_side,
        failure_count: record.failure_count,
        failures_per_month: (record.failure_count / monthsInPeriod).toFixed(2),
        common_symptoms: record.symptoms ? record.symptoms.split(',') : []
      };
    });
  }

  // วิเคราะห์การใช้อะไหล่
  analyzePartUsage(machine, machineSide = null) {
    const partStats = this.db.getPartLifespanStats(machine, machineSide, null);

    // จัดกลุ่มตาม part_code
    const partGroups = {};

    partStats.forEach(stat => {
      if (!partGroups[stat.part_code]) {
        partGroups[stat.part_code] = {
          part_code: stat.part_code,
          name_part: stat.name_part,
          replacement_count: 0,
          lifespans: [],
          last_replacement: null
        };
      }

      const group = partGroups[stat.part_code];
      group.replacement_count++;

      if (stat.days_between && stat.days_between > 0) {
        group.lifespans.push(stat.days_between);
      }

      if (!group.last_replacement || stat.replacement_date > group.last_replacement) {
        group.last_replacement = stat.replacement_date;
      }
    });

    // คำนวณสถิติ
    const results = Object.values(partGroups).map(group => {
      let avgLifespan = 0;
      let minLifespan = 0;
      let maxLifespan = 0;
      let nextReplacementEstimate = null;

      if (group.lifespans.length > 0) {
        avgLifespan = group.lifespans.reduce((a, b) => a + b, 0) / group.lifespans.length;
        minLifespan = Math.min(...group.lifespans);
        maxLifespan = Math.max(...group.lifespans);

        // ประมาณการวันเปลี่ยนครั้งต่อไป
        if (group.last_replacement) {
          const lastDate = new Date(group.last_replacement);
          const nextDate = new Date(lastDate);
          nextDate.setDate(nextDate.getDate() + Math.floor(avgLifespan));
          nextReplacementEstimate = nextDate.toISOString().split('T')[0];
        }
      }

      const daysSinceLastReplacement = group.last_replacement
        ? this.calculateDaysBetween(group.last_replacement, new Date().toISOString().split('T')[0])
        : null;

      return {
        part_code: group.part_code,
        name_part: group.name_part,
        replacement_count: group.replacement_count,
        avg_lifespan_days: Math.round(avgLifespan),
        min_lifespan_days: Math.round(minLifespan),
        max_lifespan_days: Math.round(maxLifespan),
        last_replacement: group.last_replacement,
        days_since_last_replacement: daysSinceLastReplacement,
        next_replacement_estimate: nextReplacementEstimate,
        replacement_urgency: this.calculateReplacementUrgency(
          daysSinceLastReplacement,
          avgLifespan,
          minLifespan
        )
      };
    });

    return results.sort((a, b) => b.replacement_urgency - a.replacement_urgency);
  }

  // คำนวณความเร่งด่วนในการเปลี่ยนอะไหล่
  calculateReplacementUrgency(daysSince, avgLifespan, minLifespan) {
    if (!daysSince || !avgLifespan || avgLifespan === 0) return 0;

    // ถ้าใกล้ถึงอายุขัยเฉลี่ย = urgency สูง
    const avgRatio = daysSince / avgLifespan;

    // ถ้าเกินอายุขัยต่ำสุด = urgency สูงมาก
    const minRatio = minLifespan > 0 ? daysSince / minLifespan : 0;

    // คำนวณ urgency (0-100)
    let urgency = 0;

    if (avgRatio >= 1) {
      urgency = 100; // เกินอายุเฉลี่ยแล้ว
    } else if (avgRatio >= 0.8) {
      urgency = 50 + (avgRatio - 0.8) * 250; // 80-100% ของอายุเฉลี่ย
    } else if (minRatio >= 1) {
      urgency = 75; // เกินอายุต่ำสุดแล้ว
    } else {
      urgency = avgRatio * 50;
    }

    return Math.min(100, Math.max(0, urgency));
  }

  // คำนวณจำนวนวันระหว่างวันที่
  calculateDaysBetween(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  // หาอะไหล่ที่ควรเตรียม
  getRecommendedPartInventory(machine, forecastMonths = 3) {
    const allRecords = this.db.getRecordsByMachine(machine);

    if (allRecords.length === 0) {
      return [];
    }

    // หาวันที่เก่าสุดและใหม่สุด
    const dates = allRecords.map(r => new Date(r.date_failure));
    const oldestDate = new Date(Math.min(...dates));
    const newestDate = new Date(Math.max(...dates));
    const totalDays = this.calculateDaysBetween(oldestDate, newestDate);
    const totalMonths = totalDays / 30;

    // นับการใช้อะไหล่แต่ละตัว
    const partUsage = {};

    allRecords.forEach(record => {
      const parts = this.db.db
        .prepare(
          `SELECT part_code, quantity
           FROM part_usage
           WHERE maintenance_id = ?`
        )
        .all(record.id);

      parts.forEach(part => {
        if (!partUsage[part.part_code]) {
          partUsage[part.part_code] = {
            part_code: part.part_code,
            total_usage: 0
          };
        }
        partUsage[part.part_code].total_usage += part.quantity;
      });
    });

    // คำนวณการใช้ต่อเดือนและจำนวนที่ควรเตรียม
    const recommendations = Object.values(partUsage).map(part => {
      const usagePerMonth = part.total_usage / totalMonths;
      const recommendedQuantity = Math.ceil(usagePerMonth * forecastMonths);

      // ดึงข้อมูลอะไหล่
      const partInfo = this.db.db
        .prepare('SELECT name_part FROM parts WHERE part_code = ?')
        .get(part.part_code);

      return {
        part_code: part.part_code,
        name_part: partInfo ? partInfo.name_part : 'N/A',
        historical_usage: part.total_usage,
        usage_per_month: usagePerMonth.toFixed(2),
        recommended_quantity: recommendedQuantity,
        forecast_months: forecastMonths
      };
    });

    return recommendations.sort((a, b) => b.usage_per_month - a.usage_per_month);
  }

  // สรุปภาพรวมเครื่องจักร
  getMachineSummary(machine) {
    const allRecords = this.db.getRecordsByMachine(machine);

    if (allRecords.length === 0) {
      return null;
    }

    // หาวันที่เก่าสุดและใหม่สุด
    const dates = allRecords.map(r => new Date(r.date_failure));
    const oldestDate = new Date(Math.min(...dates));
    const newestDate = new Date(Math.max(...dates));
    const totalDays = this.calculateDaysBetween(oldestDate, newestDate);

    // นับการเสียตาม machine_side
    const sideCount = {};
    allRecords.forEach(record => {
      const side = record.machine_side || 'N/A';
      sideCount[side] = (sideCount[side] || 0) + 1;
    });

    // นับอาการเสียที่พบบ่อย
    const symptomCount = {};
    allRecords.forEach(record => {
      const symptom = record.symptom_normalized || record.symptom;
      symptomCount[symptom] = (symptomCount[symptom] || 0) + 1;
    });

    const topSymptoms = Object.entries(symptomCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([symptom, count]) => ({ symptom, count }));

    return {
      machine: machine,
      total_failures: allRecords.length,
      period_days: totalDays,
      first_record: oldestDate.toISOString().split('T')[0],
      last_record: newestDate.toISOString().split('T')[0],
      failures_per_month: ((allRecords.length / totalDays) * 30).toFixed(2),
      side_breakdown: sideCount,
      top_symptoms: topSymptoms
    };
  }
}

module.exports = DataAnalyzer;
