import { Injectable } from '@nestjs/common';
import type { Member } from './member';
@Injectable()
export class MembersService {
  private members: Member[] = [];
  findAll(): Member[] {
    return this.members;
  }
  findOne(id: number): Member | undefined {
    return this.members.find((member) => member.id === id);
  }
  create(name: string, email: string): Member {
    const nextId =
      this.members.length > 0
        ? Math.max(...this.members.map((m) => m.id)) + 1
        : 1;
    const newMember: Member = { id: nextId, name, email };
    this.members.push(newMember);
    return newMember;
  }
}
