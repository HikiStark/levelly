import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json(
    { error: 'Questionnaire feature has been removed.' },
    { status: 410 }
  )
}
