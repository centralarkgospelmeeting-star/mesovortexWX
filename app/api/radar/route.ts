export async function GET() {
  return Response.json({
    status: 'LIVE • NEXRAD + DOW',
    site: 'KOUN',
    product: 'ref',
    frames: [
      '/images/radar-frame-1.jpg',
      '/images/radar-frame-2.jpg',
      '/images/radar-frame-3.jpg'
    ]
  });
}
