export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const site = searchParams.get('site') || 'KOUN';
  const limit = parseInt(searchParams.get('limit') || '6', 10);

  try {
    // Fetch from NOAA's NEXRAD Level 2 AWS bucket
    // Using the open data registry
    const today = new Date();
    const year = today.getUTCFullYear();
    const month = String(today.getUTCMonth() + 1).padStart(2, '0');
    const day = String(today.getUTCDate()).padStart(2, '0');

    const s3Prefix = `https://noaa-nexrad-level2.s3.amazonaws.com/${year}/${month}/${day}/${site}`;

    // Generate simulated frames based on current time
    // In production, you would query AWS S3 listing API or use a NEXRAD tile service
    const frames: string[] = [];
    const now = Date.now();

    for (let i = 0; i < limit; i++) {
      const frameTime = new Date(now - i * 5 * 60 * 1000); // 5 min intervals
      const timeStr = frameTime.toISOString().replace(/[-:]/g, '').split('.')[0];
      frames.push(`${s3Prefix}/${site}${timeStr}.nex2`);
    }

    return Response.json({
      site,
      frames: frames.reverse(), // Oldest first
      timestamp: new Date().toISOString(),
      note: 'Frames are simulated. Use RAINVIEWER or NEXRAD tile service for real imagery.'
    });
  } catch (error) {
    console.error('NEXRAD frame fetch error:', error);
    return Response.json({
      site,
      frames: [],
      error: 'Failed to fetch frames'
    });
  }
}
