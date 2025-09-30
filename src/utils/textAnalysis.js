// วิเคราะห์ความคล้ายคลึงของข้อความภาษาไทย

class TextAnalyzer {
  // คำนวณ Levenshtein Distance
  static levenshteinDistance(str1, str2) {
    const len1 = str1.length;
    const len2 = str2.length;
    const matrix = [];

    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }

    return matrix[len1][len2];
  }

  // คำนวณความคล้ายคลึง (0-1)
  static similarity(str1, str2) {
    if (!str1 || !str2) return 0;

    // Normalize ข้อความ
    const s1 = this.normalize(str1);
    const s2 = this.normalize(str2);

    if (s1 === s2) return 1;

    const maxLen = Math.max(s1.length, s2.length);
    const distance = this.levenshteinDistance(s1, s2);
    return 1 - distance / maxLen;
  }

  // Normalize ข้อความ
  static normalize(text) {
    if (!text) return '';
    return text
      .toString()
      .toLowerCase()
      .trim()
      // ลบช่องว่างซ้ำซ้อน
      .replace(/\s+/g, ' ')
      // ลบอักขระพิเศษที่ไม่จำเป็น
      .replace(/[^\u0E00-\u0E7Fa-zA-Z0-9\s]/g, '');
  }

  // แยก token สำหรับภาษาไทย (คำพื้นฐาน)
  static tokenize(text) {
    const normalized = this.normalize(text);
    // แยกตามช่องว่างและอักขระ
    return normalized.match(/[\u0E00-\u0E7F]+|[a-zA-Z0-9]+/g) || [];
  }

  // หาข้อความที่คล้ายกันในชุดข้อมูล
  static findSimilarTexts(targetText, textList, threshold = 0.75) {
    const results = [];

    for (let i = 0; i < textList.length; i++) {
      const similarity = this.similarity(targetText, textList[i]);
      if (similarity >= threshold) {
        results.push({
          text: textList[i],
          similarity: similarity,
          index: i
        });
      }
    }

    return results.sort((a, b) => b.similarity - a.similarity);
  }

  // จัดกลุ่มข้อความที่คล้ายกัน
  static clusterSimilarTexts(textList, threshold = 0.75) {
    const clusters = [];
    const processed = new Set();

    for (let i = 0; i < textList.length; i++) {
      if (processed.has(i)) continue;

      const cluster = {
        representative: textList[i],
        variants: [textList[i]],
        indices: [i]
      };

      for (let j = i + 1; j < textList.length; j++) {
        if (processed.has(j)) continue;

        const similarity = this.similarity(textList[i], textList[j]);
        if (similarity >= threshold) {
          cluster.variants.push(textList[j]);
          cluster.indices.push(j);
          processed.add(j);
        }
      }

      processed.add(i);
      clusters.push(cluster);
    }

    return clusters;
  }

  // ค้นหาข้อความที่ดีที่สุดเป็นตัวแทนของกลุ่ม
  static findRepresentative(textList) {
    if (textList.length === 0) return '';
    if (textList.length === 1) return textList[0];

    // หาข้อความที่มี similarity รวมสูงสุดกับข้อความอื่น
    let bestText = textList[0];
    let bestScore = 0;

    for (const text1 of textList) {
      let score = 0;
      for (const text2 of textList) {
        if (text1 !== text2) {
          score += this.similarity(text1, text2);
        }
      }
      if (score > bestScore) {
        bestScore = score;
        bestText = text1;
      }
    }

    return bestText;
  }

  // แยกคำที่เป็นข้อผิดพลาดทั่วไป
  static extractKeywords(text) {
    const normalized = this.normalize(text);
    const tokens = this.tokenize(text);
    return {
      normalized: normalized,
      tokens: tokens,
      length: text.length
    };
  }
}

module.exports = TextAnalyzer;
