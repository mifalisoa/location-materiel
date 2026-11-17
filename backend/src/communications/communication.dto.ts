import { IsInt, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class SendMessageDto {
  @IsString() @MinLength(1) @MaxLength(5000) contenu: string;
}

export class ReadNotificationsDto {
  @IsInt() @Min(1) id: number;
}
