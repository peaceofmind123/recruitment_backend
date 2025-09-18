if assignment.beforeBreak == true:
    if assignment.totalNumDays < 90:
        search_backward_until(previousAssignment.workOffice == assignment.workOffice) is found. 
        
        Get the district  of the previousAssignment, get its corresponding category and from it, find its marks from the category-marks entity where type='old'.
        
        calculate marks = category-marks * assignment.totalNumDays/365.

    else:
        Get the district of the assignment, its corresponding category and from it, find its marks from the category-marks entity where type = 'old' and gender = employee.gender.
        
        calculate marks = category-marks * assignment.years + category-marks * assignment.months /12 + category-marks* assignment.days / 365.
else:
    if assignment.totalNumDays < 233:
        category-marks = 1.75.

        calculate marks = category-marks * assignment.years + category-marks * assignment.months /12 + category-marks* assignment.days / 365.
    else:
         Get the district of the assignment, its corresponding category and from it, find its marks from the category-marks entity where type = 'new'.
         
         calculate marks = category-marks * assignment.years + category-marks*assignment.months/12 + category-marks*assignment.days/365.
         