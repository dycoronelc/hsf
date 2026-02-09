'use client'

import Link from 'next/link'
import { SiteLayout } from './components/SiteLayout'

export default function Home() {
  return (
    <SiteLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Plataforma de Gestión de Pacientes
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Gestiona tus turnos, preadmisiones y citas de manera sencilla
          </p>
        </div>

        {/* Services Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
            <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-hospital-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Preadmisión Digital</h3>
            <p className="text-gray-600 mb-4">
              Completa tu preadmisión para Laboratorio o Radiología de forma rápida y segura
            </p>
            <Link 
              href="/preadmission"
              className="text-hospital-blue hover:underline font-medium"
            >
              Iniciar Preadmisión →
            </Link>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
            <div className="w-16 h-16 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Gestión de Turnos</h3>
            <p className="text-gray-600 mb-4">
              Toma tu turno virtual y sigue el estado en tiempo real desde tu dispositivo
            </p>
            <div className="space-y-2">
              <Link 
                href="/tickets/new"
                className="block text-hospital-blue hover:underline font-medium"
              >
                Tomar Turno (Autenticado) →
              </Link>
              <Link 
                href="/kiosk"
                className="block text-hospital-blue hover:underline font-medium text-sm"
              >
                Kiosco Virtual (Sin registro) →
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
            <div className="w-16 h-16 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Agendar Citas</h3>
            <p className="text-gray-600 mb-4">
              Reserva tu cita con anticipación para servicios que lo requieren
            </p>
            <div className="space-y-2">
              <Link 
                href="/appointments"
                className="block text-hospital-blue hover:underline font-medium"
              >
                Ver Mis Citas →
              </Link>
              <Link 
                href="/appointments/new"
                className="block text-hospital-blue hover:underline font-medium text-sm"
              >
                Agendar Nueva Cita →
              </Link>
            </div>
          </div>
        </div>

        {/* Monitor Link */}
        <div className="bg-gradient-to-r from-hospital-blue to-hospital-blue-dark rounded-lg p-8 text-white text-center">
          <h3 className="text-2xl font-bold mb-4">Pantalla de Llamados</h3>
          <p className="mb-6">Visualiza las listas de espera en tiempo real</p>
          <Link 
            href="/monitor"
            className="bg-white text-hospital-blue px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 inline-block"
          >
            Ver Monitor
          </Link>
        </div>
      </div>
    </SiteLayout>
  )
}
