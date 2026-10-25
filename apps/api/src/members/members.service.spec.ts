import { MembersService } from './members.service';

describe('MembersService', () => {
  let service: MembersService;

  beforeEach(() => {
    service = new MembersService();
  });

  it('creates the first member with id 1', () => {
    const member = service.create('John Doe', 'john.doe@example.com');
    expect(member.id).toBe(1);
    expect(member.name).toBe('John Doe');
    expect(member.email).toBe('john.doe@example.com');
  });

  it('gives each new member the next id', () => {
    const member1 = service.create('John Doe', 'john.doe@example.com');
    const member2 = service.create('Jane Smith', 'jane.smith@example.com');
    expect(member1.id).toBe(1);
    expect(member2.id).toBe(2);
  });

  it('finds a member by id', () => {
    const member = service.create('John Doe', 'john.doe@example.com');
    const foundMember = service.findOne(member.id);
    expect(foundMember).toBe(member);
  });

  it('returns undefined for an unknown id', () => {
    const foundMember = service.findOne(99);
    expect(foundMember).toBeUndefined();
  });

  it('lists all members', () => {
    const member1 = service.create('John Doe', 'john.doe@example.com');
    const member2 = service.create('Jane Smith', 'jane.smith@example.com');
    const members = service.findAll();
    expect(members).toEqual([member1, member2]);
  });

  it('does not expose its internal list', () => {
    service.create('John Doe', 'john.doe@example.com');
    const members = service.findAll();
    members.push({ id: 99, name: 'Fake Member', email: 'fake@example.com' });
    const membersAfterPush = service.findAll();
    expect(membersAfterPush).toHaveLength(1);
  });
});
