const { convertDate, parseNepaliDate } = require('./date_converter');

async function testConverter() {
    console.log('Testing date converter...\n');
    
    // Test dates
    const testDates = [
        '1980-01-01',
        '2025-01-01',
        '2033-12-31'
    ];
    
    for (const date of testDates) {
        console.log(`Testing date: ${date}`);
        const result = await convertDate(date);
        console.log(`Result: ${result.nepaliDate}`);
        console.log(`Success: ${result.success}`);
        console.log('---');
        
        // Add a small delay between tests
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('Test completed!');
}

// Test the parsing function with sample HTML
function testParsing() {
    console.log('Testing HTML parsing...\n');
    
    const sampleHtml1 = '<strong>Result: </strong>बुधवार January , 2025 | <span>२०८१ पुष १७, बुधवार</span>';
    const sampleHtml2 = '<strong>Result: </strong>मंगलवार January , 1980 | <span>२०३६ पुष १७, मंगलवार</span>';
    
    console.log('Sample 1:', sampleHtml1);
    console.log('Parsed:', parseNepaliDate(sampleHtml1));
    console.log('---');
    
    console.log('Sample 2:', sampleHtml2);
    console.log('Parsed:', parseNepaliDate(sampleHtml2));
    console.log('---');
}

if (require.main === module) {
    testParsing();
    testConverter().catch(console.error);
} 