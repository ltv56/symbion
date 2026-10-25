import { Injectable } from '@nestjs/common';
import type { Member } from './member';

@Injectable()
export class MembersService {
  private members: Member[] = [];
  private nextId = 1;

  findAll(): Member[] {
    return [...this.members];
  }
  findOne(id: number): Member | undefined {
    return this.members.find((member) => member.id === id);
  }
  create(name: string, email: string): Member {
    const member: Member = {
      id: this.nextId++,
      name,
      email,
    };

    this.members.push(member);
    return member;
  }
}
