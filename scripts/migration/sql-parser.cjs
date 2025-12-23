const fs = require('fs');
const readline = require('readline');

async function parseInsertStatements(filePath, tableName) {
  const records = [];
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });
  
  let inTable = false;
  let buffer = '';
  
  for await (const line of rl) {
    if (line.includes(`INSERT INTO \`${tableName}\``)) {
      inTable = true;
      buffer = line;
    } else if (inTable) {
      buffer += line;
      if (line.includes(';')) {
        const parsed = parseInsertBuffer(buffer, tableName);
        records.push(...parsed);
        inTable = false;
        buffer = '';
      }
    }
  }
  
  return records;
}

function parseInsertBuffer(buffer, tableName) {
  const records = [];
  
  const colMatch = buffer.match(/\(([^)]+)\)\s+VALUES/i);
  if (!colMatch) return records;
  
  const columns = colMatch[1].split(',').map(c => c.trim().replace(/`/g, ''));
  
  const valuesSection = buffer.substring(buffer.indexOf('VALUES') + 6);
  const valueGroups = extractValueGroups(valuesSection);
  
  for (const group of valueGroups) {
    const values = parseValueGroup(group);
    if (values.length === columns.length) {
      const record = {};
      columns.forEach((col, i) => {
        record[col] = values[i];
      });
      records.push(record);
    }
  }
  
  return records;
}

function extractValueGroups(valuesSection) {
  const groups = [];
  let depth = 0;
  let current = '';
  let inString = false;
  let stringChar = '';
  let escaped = false;
  
  for (let i = 0; i < valuesSection.length; i++) {
    const char = valuesSection[i];
    
    if (escaped) {
      current += char;
      escaped = false;
      continue;
    }
    
    if (char === '\\') {
      escaped = true;
      current += char;
      continue;
    }
    
    if (!inString && (char === "'" || char === '"')) {
      inString = true;
      stringChar = char;
      current += char;
    } else if (inString && char === stringChar) {
      inString = false;
      current += char;
    } else if (!inString && char === '(') {
      if (depth === 0) {
        current = '';
      } else {
        current += char;
      }
      depth++;
    } else if (!inString && char === ')') {
      depth--;
      if (depth === 0) {
        groups.push(current);
      } else {
        current += char;
      }
    } else if (depth > 0) {
      current += char;
    }
  }
  
  return groups;
}

function parseValueGroup(group) {
  const values = [];
  let current = '';
  let inString = false;
  let stringChar = '';
  let escaped = false;
  
  for (let i = 0; i < group.length; i++) {
    const char = group[i];
    
    if (escaped) {
      current += char;
      escaped = false;
      continue;
    }
    
    if (char === '\\') {
      escaped = true;
      continue;
    }
    
    if (!inString && (char === "'" || char === '"')) {
      inString = true;
      stringChar = char;
    } else if (inString && char === stringChar) {
      inString = false;
    } else if (!inString && char === ',') {
      values.push(cleanValue(current.trim()));
      current = '';
      continue;
    }
    
    current += char;
  }
  
  if (current.trim()) {
    values.push(cleanValue(current.trim()));
  }
  
  return values;
}

function cleanValue(val) {
  if (val === 'NULL' || val === 'null') return null;
  if (val.startsWith("'") && val.endsWith("'")) {
    return val.slice(1, -1).replace(/''/g, "'");
  }
  if (val.startsWith('"') && val.endsWith('"')) {
    return val.slice(1, -1);
  }
  const num = Number(val);
  if (!isNaN(num) && val !== '') return num;
  return val;
}

module.exports = { parseInsertStatements };
