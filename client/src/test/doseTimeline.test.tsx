import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DoseTimeline } from '../components/medication/DoseTimeline.js';
import { LanguageProvider } from '../context/LanguageContext.js';
import { A11yProvider } from '../context/A11yContext.js';
import { MedicationAdministrationRecord } from '../types/index.js';

describe('DoseTimeline Component Tests', () => {
  const mockRecords: MedicationAdministrationRecord[] = [
    {
      id: 'dose-1',
      patient_id: 'patient-1',
      medication_id: 'med-1',
      scheduled_time: new Date().toISOString(),
      status: 'taken',
      actual_time: new Date().toISOString(),
      medication: {
        id: 'med-1',
        patient_id: 'patient-1',
        name: 'Lisinopril',
        category: 'Blood Pressure',
        dosage: '1 Tablet',
        strength: '10mg',
        frequency: 'Once daily',
        times_of_day: ['08:00'],
        instructions: 'Take in morning',
        is_active: true
      }
    },
    {
      id: 'dose-2',
      patient_id: 'patient-1',
      medication_id: 'med-2',
      scheduled_time: new Date().toISOString(),
      status: 'due_now',
      medication: {
        id: 'med-2',
        patient_id: 'patient-1',
        name: 'Metformin HCl',
        category: 'Diabetes',
        dosage: '1 Tablet',
        strength: '500mg',
        frequency: 'Twice daily',
        times_of_day: ['19:00'],
        instructions: 'Take with food',
        is_active: true
      }
    }
  ];

  it('should render medication names and critical safety warning banner', () => {
    render(
      <LanguageProvider>
        <A11yProvider>
          <DoseTimeline records={mockRecords} onDoseUpdated={vi.fn()} canManageMeds={true} />
        </A11yProvider>
      </LanguageProvider>
    );

    expect(screen.getByText('Lisinopril')).toBeInTheDocument();
    expect(screen.getByText('Metformin HCl')).toBeInTheDocument();
    expect(screen.getByText(/Important Safety Notice/i)).toBeInTheDocument();
    expect(screen.getByText(/Never double the next dose/i)).toBeInTheDocument();
  });
});
