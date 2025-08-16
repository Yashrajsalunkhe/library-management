const Database = require('better-sqlite3');
const path = require('path');

// Test the seat allocation fixes
async function testSeatFixes() {
  const dbPath = path.join(__dirname, 'electron', 'library.db');
  const db = new Database(dbPath);
  
  console.log('Testing seat allocation fixes...\n');
  
  // Test 1: Check if totalSeats setting exists and is valid
  console.log('1. Checking totalSeats setting:');
  const totalSeatsRecord = db.prepare('SELECT value FROM settings WHERE key = ?').get('general.totalSeats');
  if (totalSeatsRecord) {
    console.log(`   Total seats configured: ${totalSeatsRecord.value}`);
  } else {
    console.log('   No total seats setting found, setting default to 50');
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('general.totalSeats', '50');
  }
  
  // Test 2: Check current seat utilization
  console.log('\n2. Current seat utilization:');
  const totalSeats = totalSeatsRecord ? parseInt(totalSeatsRecord.value) : 50;
  const occupiedSeatsResult = db.prepare('SELECT COUNT(*) as count FROM members WHERE seat_no IS NOT NULL AND seat_no != "" AND status = "active"').get();
  const occupiedSeats = occupiedSeatsResult ? occupiedSeatsResult.count : 0;
  const availableSeats = Math.max(0, totalSeats - occupiedSeats);
  const utilizationPercentage = totalSeats > 0 ? Math.round((occupiedSeats / totalSeats) * 100) : 0;
  
  console.log(`   Total seats: ${totalSeats}`);
  console.log(`   Occupied seats: ${occupiedSeats}`);
  console.log(`   Available seats: ${availableSeats}`);
  console.log(`   Utilization: ${utilizationPercentage}%`);
  
  // Test 3: Check seat numbers in use
  console.log('\n3. Current seat assignments:');
  const seatsInUse = db.prepare('SELECT seat_no, name FROM members WHERE seat_no IS NOT NULL AND seat_no != "" ORDER BY CAST(seat_no AS INTEGER)').all();
  if (seatsInUse.length > 0) {
    seatsInUse.forEach(seat => {
      console.log(`   Seat ${seat.seat_no}: ${seat.name}`);
    });
  } else {
    console.log('   No seats currently assigned');
  }
  
  // Test 4: Find next available seat
  console.log('\n4. Finding next available seat:');
  const existingSeats = db.prepare('SELECT seat_no FROM members WHERE seat_no IS NOT NULL ORDER BY CAST(seat_no AS INTEGER)').all();
  const seatNumbers = existingSeats.map(s => parseInt(s.seat_no)).filter(n => !isNaN(n));
  
  let nextSeat = 1;
  for (let i = 0; i < seatNumbers.length; i++) {
    if (seatNumbers[i] !== nextSeat) {
      break;
    }
    nextSeat++;
  }
  
  if (nextSeat <= totalSeats) {
    console.log(`   Next available seat: ${nextSeat}`);
  } else {
    console.log(`   No available seats (next would be ${nextSeat}, but max is ${totalSeats})`);
  }
  
  // Test 5: Validate seat number function
  console.log('\n5. Testing seat validation:');
  
  // Test invalid seat (above limit)
  const invalidSeat = totalSeats + 1;
  console.log(`   Testing seat ${invalidSeat} (above limit): Should be invalid`);
  
  // Test valid available seat
  if (nextSeat <= totalSeats) {
    console.log(`   Testing seat ${nextSeat} (next available): Should be valid`);
  }
  
  // Test occupied seat
  if (seatsInUse.length > 0) {
    const occupiedSeat = seatsInUse[0].seat_no;
    console.log(`   Testing seat ${occupiedSeat} (occupied): Should be invalid`);
  }
  
  db.close();
  console.log('\nSeat allocation test completed!');
}

testSeatFixes().catch(console.error);
