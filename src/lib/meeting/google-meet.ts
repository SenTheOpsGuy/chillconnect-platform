import { google } from 'googleapis';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'https://chillconnect.in/api/auth/google/callback'
);

oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN
});

const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

export async function createMeetingRoom(
  title: string,
  startTime: Date,
  endTime: Date,
  attendees: string[]
) {
  // In development mode, return mock meeting URL
  if (process.env.NODE_ENV === 'development' && process.env.GOOGLE_CLIENT_ID === 'development-mock-client-id') {
    console.log('📹 [MOCK GOOGLE MEET]');
    console.log('Title:', title);
    console.log('Start:', startTime.toISOString());
    console.log('End:', endTime.toISOString());
    console.log('Attendees:', attendees);
    const mockMeetUrl = `https://meet.google.com/mock-meeting-${Date.now()}`;
    console.log('Meet URL:', mockMeetUrl);
    console.log('-------------------');
    
    return {
      success: true,
      meetUrl: mockMeetUrl,
      eventId: `mock-event-${Date.now()}`
    };
  }

  try {
    const event = {
      summary: title,
      start: { dateTime: startTime.toISOString() },
      end: { dateTime: endTime.toISOString() },
      attendees: attendees.map(email => ({ email })),
      conferenceData: {
        createRequest: {
          requestId: `chillconnect-${Date.now()}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' }
        }
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 60 },
          { method: 'popup', minutes: 15 }
        ]
      }
    };

    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
      conferenceDataVersion: 1,
      sendUpdates: 'all'
    });

    return {
      success: true,
      meetUrl: response.data.hangoutLink,
      eventId: response.data.id
    };
  } catch (error) {
    console.error('Meeting creation error:', error);
    return { success: false, error };
  }
}