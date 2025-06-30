const NepaliDate = require('nepali-datetime');

console.log('Testing nepali-datetime import...');
console.log('NepaliDate type:', typeof NepaliDate);
console.log('NepaliDate constructor:', NepaliDate);

try {
    // Test creating a NepaliDate from current date
    const now = new NepaliDate();
    console.log('Current Nepali date:', now.toString());

    // Test creating from English date
    const testDate = new Date(2023, 6, 8); // July 8, 2023
    const nepaliDate = new NepaliDate(testDate);
    console.log('English date converted to Nepali:', nepaliDate.toString());
    console.log('Formatted date:', nepaliDate.format('YYYY-MM-DD'));

    console.log('✅ nepali-datetime is working correctly!');
} catch (error) {
    console.error('❌ Error with nepali-datetime:', error);
} 