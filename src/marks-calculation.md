for each assignment of assignments:
    if assignment.beforeBreak:
        if assignment.presentDays < 90:
            if assignments.isFirst(assignment):
                // TODO: handle new appointment
                pass
            else:
                prev = assignments.preceeding(assignment);
                category:= prev.category;
            end if
        else:
            category:= assignment.category;
        end if
        marksYear:= await categoryMarksRepository.findOne({ where: {category,type:'old', gender: employee.gender}});
    else:
        if assignment.presentDays < 233:
            marksYear := 1.75;
        else:
            marksYear := await categoryMarksRepository.findOne({where: {category: assignment.category, type:'new'}});
        end if
    end if

    marksMonth := marksYear/12;
    marksDays := marksYear / 365;

    yearMarks := assignment.years * marksYear;
    monthMarks := assignment.months * marksMonth;
    daysMarks := assignment.days * marksDays;

    totalMarks := yearMarks + monthMarks + daysMarks;

    assignment.totalMarks = totalMarks;
end for
return assignments; 
