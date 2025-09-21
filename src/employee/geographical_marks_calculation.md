The geographical marks calculation for each employee should be done according to the following algorithm for the excel file uploaded at the `POST /employee/upload-employee-detail` endpoint.

Algorithm:
1. Define two functions:
    a. `marksAccOld(numDays)`:
        `presentDays` = `endDateBS`- `startDateBS`;
        if `presentDays < 90`:
            `marksAccOld` := `previousRow`.workOffice.getGeographicMarks() * `numDays` / 365;
        else:
            `marksAccOld` := thisRow.workOffice.getGeographicalMarks() * `numDays` / 365;
    b. `marksAccNew(numDays)`:
        `presentDays` = `endDateBS`- `startDateBS`;
        if `presentDays < 233`:
            `marksAccNew` := `numDays` * 1.75 / 365;
        else:
            `marksAccNew` := `numDays` * thisRow.workOffice.getGeographicalMarks() / 365;  

For each employee (identified by `employeeId`),
    For each assignment row, count:
        (i). the number of days between `startDateBS` and `endDateBS` --> `totalNumDays`.
        (ii). the number of days between `startDateBS` and `2079/03/32`--> `numDaysOld`.
        (iii). the number of days between `2079/03/32` and `endDateBS` --> `numDaysNew`.
    If `startDateBS` is earlier than 2079/03/32 and endDateBS is later than 2079/03/32, the calculation for the row should be as follows:
    For the row, `totalMarks = marksAccNew(numDaysNew) + marksAccOld(numDaysOld)`
    If, on the other hand, `startDateBS` is later than 2079/03/32 or if `endDateBS` is earlier than 2079/03/32, the calculation should be as follows:
        `totalMarks = marksAccNew(totalNumDays)`
    
For now, we don't have the getGeographicalMarks() function, just return 1 for now.