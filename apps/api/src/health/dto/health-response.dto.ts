export class HealthResponseDto {
  status!: 'ok';
  service!: string;
  timestamp!: string;
  integrations!: {
    auth: string;
    persistence: string;
    orm: string;
  };
}
