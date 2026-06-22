export class HealthResponseDto {
  status!: 'ok' | 'degraded';
  service!: string;
  timestamp!: string;
  checks!: {
    api: 'ok';
    database: 'ok' | 'error';
    storage: 'ok' | 'error';
  };
}
