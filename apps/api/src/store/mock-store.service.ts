import { Injectable } from '@nestjs/common';
import { Role } from '../common/enums/role.enum';

export type ActivityStatus = 'draft' | 'published' | 'completed';
export type AttendanceStatus = 'present' | 'late' | 'absent';

export interface Activity {
  id: string;
  title: string;
  description: string;
  startsAt: string;
  endsAt: string;
  location: string;
  capacity: number;
  status: ActivityStatus;
  createdBy: string;
}

export interface Attendee {
  id: string;
  fullName: string;
  email: string;
  externalId: string;
  company?: string;
  active: boolean;
}

export interface AttendanceRecord {
  id: string;
  activityId: string;
  attendeeId: string;
  checkedInAt: string;
  status: AttendanceStatus;
  notes?: string;
  recordedBy: string;
}

export interface MockUserProfile {
  id: string;
  email: string;
  fullName: string;
  role: Role;
}

interface MockUserRecord extends MockUserProfile {
  password: string;
}

@Injectable()
export class MockStoreService {
  private activitySequence = 3;
  private attendeeSequence = 3;
  private attendanceSequence = 2;

  private readonly users: MockUserRecord[] = [
    {
      id: 'user-admin',
      email: 'admin@demo.local',
      fullName: 'Demo Admin',
      role: Role.SuperAdmin,
      password: 'admin123',
    },
    {
      id: 'user-responsable',
      email: 'responsable@demo.local',
      fullName: 'Responsable Demo',
      role: Role.Responsable,
      password: 'responsable123',
    },
    {
      id: 'user-operador',
      email: 'operador@demo.local',
      fullName: 'Operador Lectura Demo',
      role: Role.OperadorLectura,
      password: 'operador123',
    },
  ];

  private readonly activities: Activity[] = [
    {
      id: 'act-1',
      title: 'Registro de voluntarios',
      description: 'Sesión de onboarding para nuevos voluntarios.',
      startsAt: '2026-06-20T08:00:00.000Z',
      endsAt: '2026-06-20T10:00:00.000Z',
      location: 'Auditorio Norte',
      capacity: 80,
      status: 'published',
      createdBy: 'user-admin',
    },
    {
      id: 'act-2',
      title: 'Capacitación de coordinadores',
      description: 'Entrenamiento operativo para líderes de sede.',
      startsAt: '2026-06-21T15:00:00.000Z',
      endsAt: '2026-06-21T17:00:00.000Z',
      location: 'Sala 3B',
      capacity: 25,
      status: 'draft',
      createdBy: 'user-organizer',
    },
  ];

  private readonly attendees: Attendee[] = [
    {
      id: 'atd-1',
      fullName: 'Lucia Perez',
      email: 'lucia.perez@example.com',
      externalId: 'EMP-1001',
      company: 'Fundacion Demo',
      active: true,
    },
    {
      id: 'atd-2',
      fullName: 'Mario Torres',
      email: 'mario.torres@example.com',
      externalId: 'EMP-1002',
      company: 'Fundacion Demo',
      active: true,
    },
  ];

  private readonly attendance: AttendanceRecord[] = [
    {
      id: 'att-1',
      activityId: 'act-1',
      attendeeId: 'atd-1',
      checkedInAt: '2026-06-20T08:15:00.000Z',
      status: 'present',
      notes: 'Ingreso por QR',
      recordedBy: 'user-organizer',
    },
  ];

  listUsers(): MockUserProfile[] {
    return this.users.map(({ password: _password, ...user }) => ({ ...user }));
  }

  getUserByEmail(email: string): MockUserProfile | undefined {
    const user = this.users.find(
      (candidate) => candidate.email.toLowerCase() === email.toLowerCase(),
    );

    if (!user) {
      return undefined;
    }

    const { password: _password, ...profile } = user;
    return profile;
  }

  getUserCredentialsByEmail(email: string): MockUserRecord | undefined {
    return this.users.find(
      (candidate) => candidate.email.toLowerCase() === email.toLowerCase(),
    );
  }

  getUserById(id: string): MockUserProfile | undefined {
    const user = this.users.find((candidate) => candidate.id === id);

    if (!user) {
      return undefined;
    }

    const { password: _password, ...profile } = user;
    return profile;
  }

  listActivities(): Activity[] {
    return [...this.activities];
  }

  createActivity(payload: Omit<Activity, 'id'>): Activity {
    const activity: Activity = {
      id: `act-${this.activitySequence++}`,
      ...payload,
    };
    this.activities.unshift(activity);
    return activity;
  }

  getActivityById(activityId: string): Activity | undefined {
    return this.activities.find((activity) => activity.id === activityId);
  }

  listAttendees(): Attendee[] {
    return [...this.attendees];
  }

  createAttendee(payload: Omit<Attendee, 'id'>): Attendee {
    const attendee: Attendee = {
      id: `atd-${this.attendeeSequence++}`,
      ...payload,
    };
    this.attendees.unshift(attendee);
    return attendee;
  }

  getAttendeeById(attendeeId: string): Attendee | undefined {
    return this.attendees.find((attendee) => attendee.id === attendeeId);
  }

  listAttendance(): AttendanceRecord[] {
    return [...this.attendance];
  }

  createAttendanceRecord(
    payload: Omit<AttendanceRecord, 'id'>,
  ): AttendanceRecord {
    const record: AttendanceRecord = {
      id: `att-${this.attendanceSequence++}`,
      ...payload,
    };
    this.attendance.unshift(record);
    return record;
  }
}
