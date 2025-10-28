import { ApiProperty } from '@nestjs/swagger';
import { AssignmentWithExtrasDto } from './assignment-with-extras.dto';
import { AbsentDetailDto } from './absent-detail.dto';
import { LeaveDetailDto } from './leave-detail.dto';
import { RewardPunishmentDetailDto } from './reward-punishment-detail.dto';

export class SenioritySegmentDto {
    @ApiProperty({ description: 'Segment start date BS (x)' })
    startDateBS: string;

    @ApiProperty({ description: 'Segment end date BS (y)' })
    endDateBS: string;

    @ApiProperty({ description: 'Years in segment' })
    years: number;

    @ApiProperty({ description: 'Months in segment' })
    months: number;

    @ApiProperty({ description: 'Days in segment' })
    days: number;

    @ApiProperty({ description: 'Marks for this segment (0 for absent/non-standard leave range)' })
    marks: number;

    @ApiProperty({ required: false, description: 'Remarks for absent or non-standard leave segments' })
    remarks?: string;
}

export class EmployeeCompleteDetailsDto {
    // Flattened from EmployeeBasicDetailsDto
    @ApiProperty()
    employeeId: number;

    @ApiProperty()
    name: string;

    @ApiProperty()
    level: number;

    @ApiProperty()
    workingOffice: string;

    @ApiProperty()
    position: string;

    @ApiProperty()
    dob: string;

    @ApiProperty()
    group: string;

    // Assignments array remains nested as items
    @ApiProperty({ type: [AssignmentWithExtrasDto] })
    assignments: AssignmentWithExtrasDto[];

    @ApiProperty({ type: [AbsentDetailDto] })
    absents: AbsentDetailDto[];

    @ApiProperty({ type: [LeaveDetailDto] })
    leaves: LeaveDetailDto[];

    @ApiProperty({ type: [RewardPunishmentDetailDto] })
    rewardsPunishments: RewardPunishmentDetailDto[];

    @ApiProperty({ description: '2D array of seniority segments; rows represent continuous periods split by absences/non-standard leaves', isArray: true, type: () => SenioritySegmentDto })
    seniorityDetails: SenioritySegmentDto[][];
}


