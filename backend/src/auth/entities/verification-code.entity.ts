import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('verification_codes')
export class VerificationCode {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  channel: string;

  @Column()
  destination: string;

  @Column()
  code: string;

  @Column()
  expiresAt: Date;

  @Column({ default: false })
  verified: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
