import { ApiProperty } from '@nestjs/swagger';

export class DistrictCategoryMapDto {
    @ApiProperty()
    district: string;
    @ApiProperty()
    category: string;
}

export class OfficeDistrictMapDto {
    @ApiProperty()
    office: string;
    @ApiProperty()
    district: string;
}

export class CategoryMarksDto {
    @ApiProperty()
    category: string;
    @ApiProperty()
    marks: number;
    @ApiProperty()
    type: string;
    @ApiProperty({ required: false, nullable: true })
    gender?: string | null;
}

export class DistrictDataResponseDto {
    @ApiProperty({ type: [DistrictCategoryMapDto] })
    districtCategoryMap: DistrictCategoryMapDto[];
    @ApiProperty({ type: [OfficeDistrictMapDto] })
    officeDistrictMap: OfficeDistrictMapDto[];
    @ApiProperty({ type: [CategoryMarksDto] })
    categoryMarks: CategoryMarksDto[];
} 