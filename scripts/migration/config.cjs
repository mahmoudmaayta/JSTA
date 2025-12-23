const path = require('path');

module.exports = {
  legacySqlFile: path.join(__dirname, '../../attached_assets/jstaorg_members_(22-12-2025)_1766494354374.sql'),
  outputDir: path.join(__dirname, 'output'),
  
  cityMapping: {
    1: 'عمان',
    2: 'إربد',
    3: 'الزرقاء',
    4: 'البلقاء',
    5: 'جرش',
    6: 'الطفيلة',
    7: 'العقبة',
    8: 'الكرك',
    9: 'مادبا',
    10: 'معان',
    11: 'المفرق',
    12: 'عجلون',
    13: 'البتراء',
    14: 'وادي رم',
    15: 'وادي موسى',
    16: 'ام اذينة'
  },
  
  tourismActivityMapping: {
    1: 'TRAVEL_TICKETING',
    2: 'TOURISM_PROGRAMS',
    3: 'HAJJ_UMRAH',
    4: 'CAR_RENTAL',
    5: 'GENERAL'
  },
  
  jobTitleMapping: {
    1: 'مدير عام',
    2: 'مدير',
    3: 'موظف',
    4: 'محاسب',
    5: 'سكرتير',
    6: 'مفوض'
  },

  nationalityMapping: {
    'JOR': 'أردني',
    'JO': 'أردني',
    'EGY': 'مصري',
    'SYR': 'سوري',
    'PAL': 'فلسطيني',
    'IRQ': 'عراقي',
    'SAU': 'سعودي',
    'KWT': 'كويتي',
    'ARE': 'إماراتي',
    'LBN': 'لبناني'
  }
};
