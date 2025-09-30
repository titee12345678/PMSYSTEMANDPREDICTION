// Machine Learning Predictor สำหรับพยากรณ์การบำรุงรักษา

class MaintenancePredictor {
  constructor(db) {
    this.db = db;
  }

  // พยากรณ์วันที่จะเกิดการเสียครั้งต่อไป (Simple Moving Average)
  predictNextFailure(machine, machineSide = null) {
    let records;
    if (machineSide) {
      records = this.db.getRecordsByMachineAndSide(machine, machineSide);
    } else {
      records = this.db.getRecordsByMachine(machine);
    }

    if (records.length < 2) {
      return {
        prediction: null,
        confidence: 0,
        message: 'ข้อมูลไม่เพียงพอสำหรับการพยากรณ์ (ต้องมีอย่างน้อย 2 ครั้ง)'
      };
    }

    // เรียงตามวันที่
    records.sort((a, b) => {
      const dateA = new Date(`${a.date_failure} ${a.time_failure}`);
      const dateB = new Date(`${b.date_failure} ${b.time_failure}`);
      return dateA - dateB;
    });

    // คำนวณช่วงเวลาระหว่างการเสีย
    const intervals = [];
    for (let i = 1; i < records.length; i++) {
      const prevDate = new Date(`${records[i - 1].date_failure} ${records[i - 1].time_failure}`);
      const currDate = new Date(`${records[i].date_failure} ${records[i].time_failure}`);
      const daysDiff = (currDate - prevDate) / (1000 * 60 * 60 * 24);
      intervals.push(daysDiff);
    }

    // คำนวณค่าเฉลี่ยและ standard deviation
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const variance =
      intervals.reduce((sum, val) => sum + Math.pow(val - avgInterval, 2), 0) / intervals.length;
    const stdDev = Math.sqrt(variance);

    // Weighted Moving Average (ให้น้ำหนักกับข้อมูลล่าสุดมากกว่า)
    const weights = intervals.map((_, i) => i + 1);
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    const weightedAvg =
      intervals.reduce((sum, val, i) => sum + val * weights[i], 0) / totalWeight;

    // วันที่เสียครั้งล่าสุด
    const lastFailure = new Date(
      `${records[records.length - 1].date_failure} ${records[records.length - 1].time_failure}`
    );

    // พยากรณ์วันที่เสียครั้งต่อไป
    const predictedDate = new Date(lastFailure);
    predictedDate.setDate(predictedDate.getDate() + Math.round(weightedAvg));

    // คำนวณ confidence (ยิ่ง std dev ต่ำยิ่งมั่นใจ)
    const coefficientOfVariation = stdDev / avgInterval;
    let confidence = 0;
    if (coefficientOfVariation < 0.2) {
      confidence = 90;
    } else if (coefficientOfVariation < 0.4) {
      confidence = 70;
    } else if (coefficientOfVariation < 0.6) {
      confidence = 50;
    } else {
      confidence = 30;
    }

    // คำนวณช่วง confidence interval
    const confidenceInterval = stdDev * 1.96; // 95% CI
    const earliestDate = new Date(predictedDate);
    earliestDate.setDate(earliestDate.getDate() - Math.round(confidenceInterval));
    const latestDate = new Date(predictedDate);
    latestDate.setDate(latestDate.getDate() + Math.round(confidenceInterval));

    return {
      machine: machine,
      machine_side: machineSide,
      last_failure: lastFailure.toISOString().split('T')[0],
      predicted_date: predictedDate.toISOString().split('T')[0],
      confidence: confidence,
      confidence_interval: {
        earliest: earliestDate.toISOString().split('T')[0],
        latest: latestDate.toISOString().split('T')[0]
      },
      statistics: {
        total_failures: records.length,
        avg_interval_days: Math.round(avgInterval),
        weighted_avg_days: Math.round(weightedAvg),
        std_deviation: Math.round(stdDev),
        coefficient_of_variation: coefficientOfVariation.toFixed(2)
      }
    };
  }

  // พยากรณ์อะไหล่ที่จะต้องใช้
  predictPartRequirement(machine, machineSide = null, forecastDays = 90) {
    const records = machineSide
      ? this.db.getRecordsByMachineAndSide(machine, machineSide)
      : this.db.getRecordsByMachine(machine);

    if (records.length === 0) {
      return [];
    }

    // หาวันที่เก่าสุดและใหม่สุด
    const dates = records.map(r => new Date(r.date_failure));
    const oldestDate = new Date(Math.min(...dates));
    const newestDate = new Date(Math.max(...dates));
    const totalDays = (newestDate - oldestDate) / (1000 * 60 * 60 * 24);

    // นับการใช้อะไหล่
    const partUsageMap = {};

    records.forEach(record => {
      const parts = this.db.db
        .prepare(
          `SELECT pu.part_code, p.name_part, pu.quantity
           FROM part_usage pu
           JOIN parts p ON pu.part_code = p.part_code
           WHERE pu.maintenance_id = ?`
        )
        .all(record.id);

      parts.forEach(part => {
        if (!partUsageMap[part.part_code]) {
          partUsageMap[part.part_code] = {
            part_code: part.part_code,
            name_part: part.name_part,
            total_used: 0,
            usage_dates: []
          };
        }
        partUsageMap[part.part_code].total_used += part.quantity;
        partUsageMap[part.part_code].usage_dates.push(record.date_failure);
      });
    });

    // พยากรณ์การใช้ในอนาคต
    const predictions = Object.values(partUsageMap).map(part => {
      // คำนวณอัตราการใช้ต่อวัน
      const usageRate = part.total_used / totalDays;

      // พยากรณ์จำนวนที่จะใช้ในช่วง forecastDays
      const predictedUsage = Math.ceil(usageRate * forecastDays);

      // หาวันที่ใช้ครั้งล่าสุด
      const lastUsage = new Date(Math.max(...part.usage_dates.map(d => new Date(d))));
      const daysSinceLastUse = (new Date() - lastUsage) / (1000 * 60 * 60 * 24);

      // ประมาณการวันที่จะใช้ครั้งต่อไป
      let avgDaysBetweenUsage = 0;
      if (part.usage_dates.length > 1) {
        const sortedDates = part.usage_dates
          .map(d => new Date(d))
          .sort((a, b) => a - b);
        const intervals = [];
        for (let i = 1; i < sortedDates.length; i++) {
          intervals.push((sortedDates[i] - sortedDates[i - 1]) / (1000 * 60 * 60 * 24));
        }
        avgDaysBetweenUsage = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      }

      const predictedNextUse = new Date();
      if (avgDaysBetweenUsage > 0) {
        predictedNextUse.setDate(
          predictedNextUse.getDate() + Math.round(avgDaysBetweenUsage - daysSinceLastUse)
        );
      }

      return {
        part_code: part.part_code,
        name_part: part.name_part,
        historical_usage: part.total_used,
        usage_rate_per_day: usageRate.toFixed(4),
        predicted_usage_next_90_days: predictedUsage,
        last_used: lastUsage.toISOString().split('T')[0],
        days_since_last_use: Math.round(daysSinceLastUse),
        predicted_next_use:
          avgDaysBetweenUsage > 0 ? predictedNextUse.toISOString().split('T')[0] : 'N/A',
        recommended_stock: Math.max(predictedUsage, 1)
      };
    });

    return predictions.sort((a, b) => b.predicted_usage_next_90_days - a.predicted_usage_next_90_days);
  }

  // วิเคราะห์รูปแบบการเสีย (Pattern Recognition)
  analyzeFailurePatterns(machine) {
    const records = this.db.getRecordsByMachine(machine);

    if (records.length < 5) {
      return {
        patterns: [],
        message: 'ข้อมูลไม่เพียงพอสำหรับวิเคราะห์รูปแบบ (ต้องมีอย่างน้อย 5 ครั้ง)'
      };
    }

    // วิเคราะห์ตามช่วงเวลา (เช้า/บ่าย/เย็น/กลางคืน)
    const timePatterns = { morning: 0, afternoon: 0, evening: 0, night: 0 };

    records.forEach(record => {
      const hour = parseInt(record.time_failure.split(':')[0]);
      if (hour >= 6 && hour < 12) timePatterns.morning++;
      else if (hour >= 12 && hour < 18) timePatterns.afternoon++;
      else if (hour >= 18 && hour < 22) timePatterns.evening++;
      else timePatterns.night++;
    });

    // วิเคราะห์ตามวันในสัปดาห์
    const dayPatterns = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 };
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    records.forEach(record => {
      const date = new Date(record.date_failure);
      const dayName = dayNames[date.getDay()];
      dayPatterns[dayName]++;
    });

    // วิเคราะห์ตามอาการ
    const symptomPatterns = {};
    records.forEach(record => {
      const symptom = record.symptom_normalized || record.symptom;
      symptomPatterns[symptom] = (symptomPatterns[symptom] || 0) + 1;
    });

    const topSymptoms = Object.entries(symptomPatterns)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([symptom, count]) => ({
        symptom,
        count,
        percentage: ((count / records.length) * 100).toFixed(1)
      }));

    return {
      machine: machine,
      total_records: records.length,
      time_patterns: {
        data: timePatterns,
        most_common: Object.entries(timePatterns).sort((a, b) => b[1] - a[1])[0][0]
      },
      day_patterns: {
        data: dayPatterns,
        most_common: Object.entries(dayPatterns).sort((a, b) => b[1] - a[1])[0][0]
      },
      symptom_patterns: {
        top_symptoms: topSymptoms
      }
    };
  }

  // คำนวณ Risk Score สำหรับแต่ละเครื่อง/หัว
  calculateRiskScore(machine, machineSide = null) {
    let records;
    if (machineSide) {
      records = this.db.getRecordsByMachineAndSide(machine, machineSide);
    } else {
      records = this.db.getRecordsByMachine(machine);
    }

    if (records.length === 0) {
      return { risk_score: 0, risk_level: 'UNKNOWN', message: 'ไม่มีข้อมูล' };
    }

    // เรียงตามวันที่
    records.sort((a, b) => {
      const dateA = new Date(a.date_failure);
      const dateB = new Date(b.date_failure);
      return dateA - dateB;
    });

    // คำนวณ factors ต่างๆ
    const lastFailure = new Date(records[records.length - 1].date_failure);
    const daysSinceLastFailure = (new Date() - lastFailure) / (1000 * 60 * 60 * 24);

    // ความถี่การเสีย (30 วันล่าสุด)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentFailures = records.filter(r => new Date(r.date_failure) >= thirtyDaysAgo).length;

    // Trend (เพิ่มขึ้นหรือลดลง)
    let trend = 0;
    if (records.length >= 6) {
      const recentHalf = records.slice(Math.floor(records.length / 2));
      const olderHalf = records.slice(0, Math.floor(records.length / 2));
      trend = recentHalf.length - olderHalf.length;
    }

    // คำนวณ risk score (0-100)
    let riskScore = 0;

    // Factor 1: ความถี่ใน 30 วัน (0-40 คะแนน)
    riskScore += Math.min(40, recentFailures * 10);

    // Factor 2: Trend เพิ่มขึ้น (0-30 คะแนน)
    if (trend > 0) {
      riskScore += Math.min(30, trend * 10);
    }

    // Factor 3: เวลาตั้งแต่เสียครั้งล่าสุด (0-30 คะแนน)
    if (daysSinceLastFailure <= 7) {
      riskScore += 30;
    } else if (daysSinceLastFailure <= 14) {
      riskScore += 20;
    } else if (daysSinceLastFailure <= 30) {
      riskScore += 10;
    }

    // กำหนด risk level
    let riskLevel;
    if (riskScore >= 70) riskLevel = 'HIGH';
    else if (riskScore >= 40) riskLevel = 'MEDIUM';
    else riskLevel = 'LOW';

    return {
      machine: machine,
      machine_side: machineSide,
      risk_score: Math.round(riskScore),
      risk_level: riskLevel,
      factors: {
        recent_failures_30d: recentFailures,
        days_since_last_failure: Math.round(daysSinceLastFailure),
        trend: trend > 0 ? 'INCREASING' : trend < 0 ? 'DECREASING' : 'STABLE'
      },
      recommendation: this.getRecommendation(riskScore, daysSinceLastFailure)
    };
  }

  // แนะนำการดำเนินการ
  getRecommendation(riskScore, daysSinceLastFailure) {
    if (riskScore >= 70) {
      return 'ควรตรวจสอบและบำรุงรักษาทันที - มีความเสี่ยงสูง';
    } else if (riskScore >= 40) {
      return 'ควรวางแผนตรวจสอบและบำรุงรักษาภายใน 7-14 วัน';
    } else if (daysSinceLastFailure > 90) {
      return 'ควรตรวจสอบตามปกติเพื่อป้องกัน';
    } else {
      return 'สถานะปกติ - ติดตามต่อเนื่อง';
    }
  }
}

module.exports = MaintenancePredictor;
