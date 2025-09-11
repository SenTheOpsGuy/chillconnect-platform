import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Clear existing data
  await prisma.feedback.deleteMany({});
  await prisma.transaction.deleteMany({});
  await prisma.message.deleteMany({});
  await prisma.session.deleteMany({});
  await prisma.booking.deleteMany({});
  await prisma.unmatchedRequest.deleteMany({});
  await prisma.availability.deleteMany({});
  await prisma.wallet.deleteMany({});
  await prisma.provider.deleteMany({});
  await prisma.profile.deleteMany({});
  await prisma.user.deleteMany({});

  console.log('✅ Cleared existing data');

  // Hash password for all users
  const hashedPassword = await bcrypt.hash('password123', 10);

  // Create Super Admin
  const superAdmin = await prisma.user.create({
    data: {
      email: 'admin@chillconnect.com',
      password: hashedPassword,
      role: 'SUPER_ADMIN',
      emailVerified: true,
      profile: {
        create: {
          firstName: 'Super',
          lastName: 'Admin',
        }
      },
      wallet: {
        create: {
          balance: 50000,
          pendingAmount: 0
        }
      }
    }
  });

  // Create Employees
  const employees = await Promise.all([
    prisma.user.create({
      data: {
        email: 'emily.jones@chillconnect.com',
        password: hashedPassword,
        role: 'EMPLOYEE',
        emailVerified: true,
        profile: {
          create: {
            firstName: 'Emily',
            lastName: 'Jones',
          }
        },
        wallet: {
          create: {
            balance: 25000,
            pendingAmount: 0
          }
        }
      }
    }),
    prisma.user.create({
      data: {
        email: 'michael.chen@chillconnect.com',
        password: hashedPassword,
        role: 'EMPLOYEE',
        emailVerified: true,
        profile: {
          create: {
            firstName: 'Michael',
            lastName: 'Chen',
          }
        },
        wallet: {
          create: {
            balance: 22000,
            pendingAmount: 500
          }
        }
      }
    }),
    prisma.user.create({
      data: {
        email: 'sarah.kumar@chillconnect.com',
        password: hashedPassword,
        role: 'EMPLOYEE',
        emailVerified: true,
        profile: {
          create: {
            firstName: 'Sarah',
            lastName: 'Kumar',
          }
        },
        wallet: {
          create: {
            balance: 18500,
            pendingAmount: 750
          }
        }
      }
    })
  ]);

  // Create Providers
  const providers = await Promise.all([
    // Tax Expert
    prisma.user.create({
      data: {
        email: 'rajesh.tax@provider.com',
        phone: '+918901234567',
        password: hashedPassword,
        role: 'PROVIDER',
        emailVerified: true,
        phoneVerified: true,
        profile: {
          create: {
            firstName: 'Rajesh',
            lastName: 'Sharma',
            timezone: 'Asia/Kolkata',
          }
        },
        providerProfile: {
          create: {
            expertise: ['Tax Planning', 'Income Tax', 'GST'],
            yearsExperience: 12,
            hourlyRate: 1500,
            bio: 'Chartered Accountant with 12 years of experience in tax planning and compliance. Specialized in individual and corporate tax matters, GST implementation, and tax optimization strategies.',
            rating: 4.8,
            totalSessions: 245,
            verificationStatus: 'VERIFIED',
            governmentId: 'PAN: ABCDE1234F',
            certificates: ['CA License', 'Tax Practitioner Certificate']
          }
        },
        wallet: {
          create: {
            balance: 45000,
            pendingAmount: 3000
          }
        }
      }
    }),
    // Legal Expert  
    prisma.user.create({
      data: {
        email: 'priya.legal@provider.com',
        phone: '+918912345678',
        password: hashedPassword,
        role: 'PROVIDER',
        emailVerified: true,
        phoneVerified: true,
        profile: {
          create: {
            firstName: 'Priya',
            lastName: 'Mehta',
            timezone: 'Asia/Kolkata',
          }
        },
        providerProfile: {
          create: {
            expertise: ['Corporate Law', 'Contract Law', 'Compliance'],
            yearsExperience: 8,
            hourlyRate: 2000,
            bio: 'Experienced lawyer specializing in corporate law, contract disputes, and regulatory compliance. Helped over 150 businesses with legal matters and contract negotiations.',
            rating: 4.6,
            totalSessions: 189,
            verificationStatus: 'VERIFIED',
            governmentId: 'BAR: MH/12345/2016',
            certificates: ['Law Degree', 'Bar Council Registration']
          }
        },
        wallet: {
          create: {
            balance: 62000,
            pendingAmount: 4000
          }
        }
      }
    }),
    // Financial Advisor
    prisma.user.create({
      data: {
        email: 'amit.finance@provider.com',
        phone: '+918923456789',
        password: hashedPassword,
        role: 'PROVIDER',
        emailVerified: true,
        phoneVerified: true,
        profile: {
          create: {
            firstName: 'Amit',
            lastName: 'Gupta',
            timezone: 'Asia/Kolkata',
          }
        },
        providerProfile: {
          create: {
            expertise: ['Financial Planning', 'Investment Advisory', 'Mutual Funds'],
            yearsExperience: 15,
            hourlyRate: 1800,
            bio: 'Certified Financial Planner with 15 years of experience in wealth management, investment advisory, and retirement planning. Helped clients achieve their financial goals through strategic planning.',
            rating: 4.9,
            totalSessions: 312,
            verificationStatus: 'VERIFIED',
            governmentId: 'CFP: IN/12345/2009',
            certificates: ['CFP Certification', 'AMFI Registration']
          }
        },
        wallet: {
          create: {
            balance: 78000,
            pendingAmount: 5500
          }
        }
      }
    }),
    // Business Consultant
    prisma.user.create({
      data: {
        email: 'neha.business@provider.com',
        phone: '+918934567890',
        password: hashedPassword,
        role: 'PROVIDER',
        emailVerified: true,
        phoneVerified: true,
        profile: {
          create: {
            firstName: 'Neha',
            lastName: 'Patel',
            timezone: 'Asia/Kolkata',
          }
        },
        providerProfile: {
          create: {
            expertise: ['Business Strategy', 'Startup Consulting', 'Market Research'],
            yearsExperience: 10,
            hourlyRate: 2200,
            bio: 'MBA with 10 years of experience in business strategy, startup mentoring, and market analysis. Helped over 80 startups and SMEs with business planning and growth strategies.',
            rating: 4.7,
            totalSessions: 156,
            verificationStatus: 'VERIFIED',
            governmentId: 'PAN: NHEAP5678B',
            certificates: ['MBA', 'Business Strategy Certification']
          }
        },
        wallet: {
          create: {
            balance: 55000,
            pendingAmount: 6600
          }
        }
      }
    }),
    // New Provider - Pending Verification
    prisma.user.create({
      data: {
        email: 'vikram.newbie@provider.com',
        phone: '+918945678901',
        password: hashedPassword,
        role: 'PROVIDER',
        emailVerified: true,
        phoneVerified: false,
        profile: {
          create: {
            firstName: 'Vikram',
            lastName: 'Singh',
            timezone: 'Asia/Kolkata',
          }
        },
        providerProfile: {
          create: {
            expertise: ['Digital Marketing', 'SEO', 'Social Media'],
            yearsExperience: 3,
            hourlyRate: 800,
            bio: 'Digital marketing specialist with experience in SEO, social media marketing, and online advertising. Looking to help small businesses grow their online presence.',
            rating: 0,
            totalSessions: 0,
            verificationStatus: 'PENDING',
            governmentId: 'PAN: VIKRS9012C',
            certificates: ['Google Ads Certification', 'Facebook Blueprint']
          }
        },
        wallet: {
          create: {
            balance: 0,
            pendingAmount: 0
          }
        }
      }
    })
  ]);

  // Create Provider Availability
  for (const provider of providers) {
    if (provider.role === 'PROVIDER') {
      const providerProfile = await prisma.provider.findUnique({
        where: { userId: provider.id }
      });
      
      if (providerProfile) {
        await prisma.availability.createMany({
          data: [
            { providerId: providerProfile.id, dayOfWeek: 1, startTime: '09:00', endTime: '17:00' }, // Monday
            { providerId: providerProfile.id, dayOfWeek: 2, startTime: '09:00', endTime: '17:00' }, // Tuesday
            { providerId: providerProfile.id, dayOfWeek: 3, startTime: '09:00', endTime: '17:00' }, // Wednesday
            { providerId: providerProfile.id, dayOfWeek: 4, startTime: '09:00', endTime: '17:00' }, // Thursday
            { providerId: providerProfile.id, dayOfWeek: 5, startTime: '09:00', endTime: '17:00' }, // Friday
          ]
        });
      }
    }
  }

  // Create Seekers
  const seekers = await Promise.all([
    prisma.user.create({
      data: {
        email: 'rahul.startup@seeker.com',
        phone: '+919801234567',
        password: hashedPassword,
        role: 'SEEKER',
        emailVerified: true,
        phoneVerified: true,
        profile: {
          create: {
            firstName: 'Rahul',
            lastName: 'Agarwal',
            timezone: 'Asia/Kolkata',
          }
        },
        wallet: {
          create: {
            balance: 15000,
            pendingAmount: 0
          }
        }
      }
    }),
    prisma.user.create({
      data: {
        email: 'anita.investor@seeker.com',
        phone: '+919812345678',
        password: hashedPassword,
        role: 'SEEKER',
        emailVerified: true,
        phoneVerified: true,
        profile: {
          create: {
            firstName: 'Anita',
            lastName: 'Verma',
            timezone: 'Asia/Kolkata',
          }
        },
        wallet: {
          create: {
            balance: 8000,
            pendingAmount: 2000
          }
        }
      }
    }),
    prisma.user.create({
      data: {
        email: 'suresh.taxpayer@seeker.com',
        phone: '+919823456789',
        password: hashedPassword,
        role: 'SEEKER',
        emailVerified: true,
        phoneVerified: true,
        profile: {
          create: {
            firstName: 'Suresh',
            lastName: 'Reddy',
            timezone: 'Asia/Kolkata',
          }
        },
        wallet: {
          create: {
            balance: 12500,
            pendingAmount: 1500
          }
        }
      }
    }),
    prisma.user.create({
      data: {
        email: 'kavya.freelancer@seeker.com',
        phone: '+919834567890',
        password: hashedPassword,
        role: 'SEEKER',
        emailVerified: true,
        phoneVerified: true,
        profile: {
          create: {
            firstName: 'Kavya',
            lastName: 'Nair',
            timezone: 'Asia/Kolkata',
          }
        },
        wallet: {
          create: {
            balance: 5000,
            pendingAmount: 3000
          }
        }
      }
    }),
    prisma.user.create({
      data: {
        email: 'deepak.sme@seeker.com',
        password: hashedPassword,
        role: 'SEEKER',
        emailVerified: true,
        phoneVerified: false,
        profile: {
          create: {
            firstName: 'Deepak',
            lastName: 'Joshi',
            timezone: 'Asia/Kolkata',
          }
        },
        wallet: {
          create: {
            balance: 20000,
            pendingAmount: 0
          }
        }
      }
    })
  ]);

  console.log('✅ Created users with all roles');

  // Create Bookings in various stages
  const now = new Date();
  const bookings = [];

  // Upcoming booking - CONFIRMED
  const booking1 = await prisma.booking.create({
    data: {
      seekerId: seekers[0].id, // Rahul
      providerId: providers[0].id, // Rajesh Tax
      startTime: new Date(now.getTime() + 24 * 60 * 60 * 1000), // Tomorrow
      endTime: new Date(now.getTime() + 24 * 60 * 60 * 1000 + 60 * 60 * 1000), // +1 hour
      status: 'CONFIRMED',
      amount: 1500,
      meetUrl: 'https://meet.google.com/abc-defg-hij',
    }
  });
  bookings.push(booking1);

  // Completed booking with feedback
  const booking2 = await prisma.booking.create({
    data: {
      seekerId: seekers[1].id, // Anita
      providerId: providers[2].id, // Amit Finance
      startTime: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      endTime: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000 + 90 * 60 * 1000), // +1.5 hours
      status: 'COMPLETED',
      amount: 2700, // 1.5 hours * 1800
      meetUrl: 'https://meet.google.com/xyz-uvwx-yzz',
      recordingUrl: 'https://recordings.example.com/session2.mp4'
    }
  });
  bookings.push(booking2);

  // In-progress booking (just started)
  const booking3 = await prisma.booking.create({
    data: {
      seekerId: seekers[2].id, // Suresh
      providerId: providers[0].id, // Rajesh Tax
      startTime: new Date(now.getTime() - 10 * 60 * 1000), // 10 minutes ago
      endTime: new Date(now.getTime() + 50 * 60 * 1000), // 50 minutes from now
      status: 'CONFIRMED',
      amount: 1500,
      meetUrl: 'https://meet.google.com/live-session-123',
    }
  });
  bookings.push(booking3);

  // Cancelled booking
  const booking4 = await prisma.booking.create({
    data: {
      seekerId: seekers[3].id, // Kavya
      providerId: providers[1].id, // Priya Legal
      startTime: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      endTime: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000),
      status: 'CANCELLED',
      amount: 2000,
    }
  });
  bookings.push(booking4);

  // Disputed booking
  const booking5 = await prisma.booking.create({
    data: {
      seekerId: seekers[4].id, // Deepak
      providerId: providers[3].id, // Neha Business
      startTime: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      endTime: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000), // +2 hours
      status: 'DISPUTED',
      amount: 4400, // 2 hours * 2200
      meetUrl: 'https://meet.google.com/disputed-session',
    }
  });
  bookings.push(booking5);

  // Pending booking (needs payment)
  const booking6 = await prisma.booking.create({
    data: {
      seekerId: seekers[0].id, // Rahul
      providerId: providers[3].id, // Neha Business
      startTime: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
      endTime: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000 + 90 * 60 * 1000), // +1.5 hours
      status: 'PENDING',
      amount: 3300, // 1.5 hours * 2200
    }
  });
  bookings.push(booking6);

  console.log('✅ Created bookings in various stages');

  // Create Sessions
  await prisma.session.create({
    data: {
      bookingId: booking2.id,
      startedAt: new Date(booking2.startTime),
      endedAt: new Date(booking2.endTime),
      recordingUrl: 'https://recordings.example.com/session2.mp4',
      chatExpiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000) // 24 hours from now
    }
  });

  await prisma.session.create({
    data: {
      bookingId: booking3.id,
      startedAt: new Date(booking3.startTime),
      chatExpiresAt: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000) // 2 days from now (active chat)
    }
  });

  // Create Transactions
  await prisma.transaction.createMany({
    data: [
      // Successful payment for completed booking
      {
        userId: seekers[1].id, // Anita
        bookingId: booking2.id,
        amount: -2700, // Payment deducted
        type: 'BOOKING_PAYMENT',
        status: 'completed',
        stripeId: 'pi_1234567890'
      },
      // Provider earning from completed booking
      {
        userId: providers[2].id, // Amit Finance
        bookingId: booking2.id,
        amount: 2430, // 2700 - 10% commission
        type: 'BOOKING_PAYMENT',
        status: 'completed'
      },
      // Commission for platform
      {
        userId: superAdmin.id,
        bookingId: booking2.id,
        amount: 270, // 10% commission
        type: 'COMMISSION',
        status: 'completed'
      },
      // Wallet top-up
      {
        userId: seekers[0].id, // Rahul
        amount: 5000,
        type: 'TOPUP',
        status: 'completed',
        stripeId: 'pi_0987654321'
      },
      // Refund for cancelled booking
      {
        userId: seekers[3].id, // Kavya
        bookingId: booking4.id,
        amount: 2000,
        type: 'REFUND',
        status: 'completed'
      },
      // Pending payment
      {
        userId: seekers[0].id, // Rahul
        bookingId: booking6.id,
        amount: -3300,
        type: 'BOOKING_PAYMENT',
        status: 'pending'
      }
    ]
  });

  // Create Messages
  await prisma.message.createMany({
    data: [
      // Messages for completed session
      {
        bookingId: booking2.id,
        senderId: seekers[1].id, // Anita
        receiverId: providers[2].id, // Amit
        content: 'Hi Amit, looking forward to our financial planning session!',
        createdAt: new Date(booking2.startTime.getTime() - 2 * 60 * 60 * 1000) // 2 hours before
      },
      {
        bookingId: booking2.id,
        senderId: providers[2].id, // Amit
        receiverId: seekers[1].id, // Anita
        content: 'Hello Anita! I\'ve prepared a comprehensive plan for our discussion. See you soon!',
        createdAt: new Date(booking2.startTime.getTime() - 1 * 60 * 60 * 1000) // 1 hour before
      },
      {
        bookingId: booking2.id,
        senderId: seekers[1].id, // Anita
        receiverId: providers[2].id, // Amit
        content: 'Thank you for the excellent session! The investment strategy you suggested looks perfect.',
        createdAt: new Date(booking2.endTime.getTime() + 30 * 60 * 1000) // 30 minutes after
      },
      // Messages for active session
      {
        bookingId: booking3.id,
        senderId: seekers[2].id, // Suresh
        receiverId: providers[0].id, // Rajesh
        content: 'Hi, I have some questions about GST filing for my business.',
        createdAt: new Date(booking3.startTime.getTime() - 30 * 60 * 1000) // 30 minutes before
      },
      {
        bookingId: booking3.id,
        senderId: providers[0].id, // Rajesh
        receiverId: seekers[2].id, // Suresh
        content: 'Sure Suresh! I\'ll help you with all GST related queries. Joining the call now.',
        createdAt: new Date(booking3.startTime.getTime() - 5 * 60 * 1000) // 5 minutes before
      }
    ]
  });

  // Create Feedback
  await prisma.feedback.create({
    data: {
      bookingId: booking2.id,
      giverId: seekers[1].id, // Anita
      receiverId: providers[2].id, // Amit Finance
      rating: 5,
      comment: 'Excellent financial advice! Amit provided clear explanations and practical investment strategies. Highly recommended for anyone looking for comprehensive financial planning.',
    }
  });

  // Create Unmatched Requests
  await prisma.unmatchedRequest.createMany({
    data: [
      {
        seekerEmail: 'rohit.help@gmail.com',
        seekerPhone: '+919876543210',
        expertise: 'Property Law',
        preferredTime: new Date(now.getTime() + 48 * 60 * 60 * 1000), // 2 days from now
        budget: 2500,
        status: 'pending',
        assignedTo: employees[0].id // Emily
      },
      {
        seekerEmail: 'meera.consultant@yahoo.com',
        expertise: 'Import Export Laws',
        budget: 3000,
        status: 'pending',
        assignedTo: employees[1].id // Michael
      },
      {
        seekerEmail: 'arjun.trader@gmail.com',
        seekerPhone: '+919765432109',
        expertise: 'Cryptocurrency Taxation',
        preferredTime: new Date(now.getTime() + 24 * 60 * 60 * 1000), // Tomorrow
        budget: 2000,
        status: 'resolved',
        assignedTo: employees[2].id, // Sarah
        resolvedAt: new Date(now.getTime() - 12 * 60 * 60 * 1000) // 12 hours ago
      }
    ]
  });

  console.log('✅ Created comprehensive seed data');
  
  console.log('\n📊 Summary of created data:');
  console.log(`👥 Users: ${1 + employees.length + providers.length + seekers.length}`);
  console.log(`   - Super Admin: 1`);
  console.log(`   - Employees: ${employees.length}`);
  console.log(`   - Providers: ${providers.length}`);
  console.log(`   - Seekers: ${seekers.length}`);
  console.log(`📅 Bookings: ${bookings.length} (various stages)`);
  console.log(`💬 Messages: 5`);
  console.log(`⭐ Feedback: 1`);
  console.log(`📝 Unmatched Requests: 3`);
  console.log(`💳 Transactions: 6`);
  console.log(`🎯 Sessions: 2`);

  console.log('\n🔐 Login credentials for testing:');
  console.log('All users have password: password123');
  console.log('\n📧 Email addresses:');
  console.log('Super Admin: admin@chillconnect.com');
  console.log('Employees: emily.jones@chillconnect.com, michael.chen@chillconnect.com, sarah.kumar@chillconnect.com');
  console.log('Providers: rajesh.tax@provider.com, priya.legal@provider.com, amit.finance@provider.com, neha.business@provider.com, vikram.newbie@provider.com');
  console.log('Seekers: rahul.startup@seeker.com, anita.investor@seeker.com, suresh.taxpayer@seeker.com, kavya.freelancer@seeker.com, deepak.sme@seeker.com');
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log('\n🎉 Database seeding completed successfully!');
  })
  .catch(async (e) => {
    console.error('❌ Seeding failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });