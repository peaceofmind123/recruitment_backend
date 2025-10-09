import { ApiProperty } from '@nestjs/swagger';
import { AssignmentWithExtrasDto } from './assignment-with-extras.dto';
import { AbsentDetailDto } from './absent-detail.dto';
import { LeaveDetailDto } from './leave-detail.dto';
import { RewardPunishmentDetailDto } from './reward-punishment-detail.dto';

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

    // Flattened from EmployeeSeniorityDataDto
    @ApiProperty({ description: 'Seniority date in BS (YYYY-MM-DD)' })
    seniorityDateBS: string;

    @ApiProperty({ description: 'Provided end date in BS used for calculation (YYYY-MM-DD)', required: false })
    endDateBS?: string;

    @ApiProperty({ description: 'Years elapsed from seniorityDateBS to endDateBS/today' })
    years: number;

    @ApiProperty({ description: 'Months elapsed from seniorityDateBS to endDateBS/today' })
    months: number;

    @ApiProperty({ description: 'Days elapsed from seniorityDateBS to endDateBS/today' })
    days: number;

    // Assignments array remains nested as items
    @ApiProperty({ type: [AssignmentWithExtrasDto] })
    assignments: AssignmentWithExtrasDto[];

    @ApiProperty({ type: [AbsentDetailDto] })
    absents: AbsentDetailDto[];

    @ApiProperty({ type: [LeaveDetailDto] })
    leaves: LeaveDetailDto[];

    @ApiProperty({ type: [RewardPunishmentDetailDto] })
    rewardsPunishments: RewardPunishmentDetailDto[];
}


