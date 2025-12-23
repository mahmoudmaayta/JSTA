const { Client } = require('pg');

const jobTitlesData = [
  { id: 1, name: 'شريك', nameAr: 'شريك' },
  { id: 2, name: 'مالك', nameAr: 'مالك' },
  { id: 3, name: 'رئيس مجلس الادارة', nameAr: 'رئيس مجلس الادارة' },
  { id: 4, name: 'نائب الرئيس', nameAr: 'نائب الرئيس' },
  { id: 5, name: 'مدير عام', nameAr: 'مدير عام' },
  { id: 6, name: 'نائب المدير العام', nameAr: 'نائب المدير العام' },
  { id: 7, name: 'مساعد المدير العام', nameAr: 'مساعد المدير العام' },
  { id: 8, name: 'مدير مالي', nameAr: 'مدير مالي' },
  { id: 9, name: 'مساعد مدير مالي', nameAr: 'مساعد مدير مالي' },
  { id: 10, name: 'محاسب', nameAr: 'محاسب' },
  { id: 11, name: 'محاسب جزئي', nameAr: 'محاسب جزئي' },
  { id: 12, name: 'محاسب رئيسي', nameAr: 'محاسب رئيسي' },
  { id: 13, name: 'مندوب مطار', nameAr: 'مندوب مطار' },
  { id: 14, name: 'مندوب', nameAr: 'مندوب' },
  { id: 15, name: 'سياحة صادرة', nameAr: 'سياحة صادرة' },
  { id: 16, name: 'مدير سياحة صادرة', nameAr: 'مدير سياحة صادرة' },
  { id: 17, name: 'حجوزات', nameAr: 'حجوزات' },
  { id: 18, name: 'مدير حجوزات', nameAr: 'مدير حجوزات' },
  { id: 19, name: 'حجز ومبيعات', nameAr: 'حجز ومبيعات' },
  { id: 20, name: 'مدير حجز ومبيعات', nameAr: 'مدير حجز ومبيعات' },
  { id: 21, name: 'مبيعات', nameAr: 'مبيعات' },
  { id: 22, name: 'تسويق', nameAr: 'تسويق' },
  { id: 23, name: 'مدير تسويق', nameAr: 'مدير تسويق' },
  { id: 24, name: 'مدير مبيعات', nameAr: 'مدير مبيعات' },
  { id: 25, name: 'تسويق ومبيعات', nameAr: 'تسويق ومبيعات' },
  { id: 26, name: 'مدير تسويق ومبيعات', nameAr: 'مدير تسويق ومبيعات' },
  { id: 27, name: 'علاقات عامة', nameAr: 'علاقات عامة' },
  { id: 28, name: 'مدير علاقات عامة', nameAr: 'مدير علاقات عامة' },
  { id: 29, name: 'موظف إداري', nameAr: 'موظف إداري' },
  { id: 30, name: 'سكرتاريا', nameAr: 'سكرتاريا' },
  { id: 31, name: 'سياحة واردة', nameAr: 'سياحة واردة' },
  { id: 32, name: 'مدير سياحة واردة', nameAr: 'مدير سياحة واردة' },
  { id: 33, name: 'رحلات داخلية', nameAr: 'رحلات داخلية' },
  { id: 34, name: 'مدير السياحة', nameAr: 'مدير السياحة' },
  { id: 35, name: 'حجز ومبيعات تذاكر', nameAr: 'حجز ومبيعات تذاكر' },
  { id: 36, name: 'حجز ومبيعات برامج سياحية', nameAr: 'حجز ومبيعات برامج سياحية' },
  { id: 37, name: 'حجوزات حج وعمرة', nameAr: 'حجوزات حج وعمرة' },
  { id: 38, name: 'موظف IT', nameAr: 'موظف IT' },
  { id: 39, name: 'مدخل بيانات', nameAr: 'مدخل بيانات' },
  { id: 40, name: 'عمليات', nameAr: 'عمليات' },
  { id: 41, name: 'مدير تطوير الاعمال', nameAr: 'مدير تطوير الاعمال' },
  { id: 42, name: 'شؤون موظفين', nameAr: 'شؤون موظفين' },
  { id: 43, name: 'مدير شؤون موظفين', nameAr: 'مدير شؤون موظفين' },
  { id: 44, name: 'عضو هيئة إدارية', nameAr: 'عضو هيئة إدارية' },
  { id: 45, name: 'مراسل', nameAr: 'مراسل' },
  { id: 46, name: 'مدير مكتب', nameAr: 'مدير مكتب' },
  { id: 47, name: 'مدير عمليات', nameAr: 'مدير عمليات' },
  { id: 49, name: 'مفوض', nameAr: 'مفوض' },
  { id: 50, name: 'مدير فرع', nameAr: 'مدير فرع' },
  { id: 51, name: 'سائق', nameAr: 'سائق' },
  { id: 52, name: 'موظف استقبال', nameAr: 'موظف استقبال' },
  { id: 53, name: 'محصل', nameAr: 'محصل' },
  { id: 54, name: 'معقب معاملات', nameAr: 'معقب معاملات' }
];

async function importJobTitles() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    console.log('Connected to database');

    const existingResult = await client.query('SELECT COUNT(*) as count FROM job_titles');
    const existingCount = parseInt(existingResult.rows[0].count);
    
    if (existingCount > 0) {
      console.log(`Job titles table already has ${existingCount} records. Skipping import.`);
      return;
    }

    console.log(`Importing ${jobTitlesData.length} job titles...`);

    let inserted = 0;
    for (const jobTitle of jobTitlesData) {
      await client.query(
        'INSERT INTO job_titles (legacy_id, name, name_ar) VALUES ($1, $2, $3)',
        [jobTitle.id, jobTitle.name, jobTitle.nameAr]
      );
      inserted++;
    }

    console.log(`Successfully imported ${inserted} job titles`);

    const verifyResult = await client.query('SELECT COUNT(*) as count FROM job_titles');
    console.log(`Verification: ${verifyResult.rows[0].count} job titles in database`);

  } catch (error) {
    console.error('Error importing job titles:', error);
    throw error;
  } finally {
    await client.end();
  }
}

importJobTitles().catch(console.error);
