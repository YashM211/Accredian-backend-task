const express = require('express');
import { z } from "zod";
import {Request,Response} from "express"

const { PrismaClient } = require('@prisma/client');
// const { Request,Response } = require('express');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const cors = require('cors');
const dotenv = require('dotenv');


dotenv.config();

const prisma = new PrismaClient();
const app = express();

app.use(bodyParser.json());
app.use(cors());

// Define referral schema using Zod
const referralSchema = z.object({
  referrerName: z.string(),
  referrerEmail: z.string().email(),
  refereeName: z.string(),
  refereeEmail: z.string().email(),
});



// Define a type based on the schema
type ReferralInput = z.infer<typeof referralSchema>;

app.post('/api/referrals', async (req: Request, res: Response) => {
  const validationResult = referralSchema.safeParse(req.body);

  if (!validationResult.success) {
    return res.status(400).json({ error: 'Check your inputs' }); // ✅ No more error
  }

  const { referrerName, referrerEmail, refereeName, refereeEmail } = validationResult.data;
  

  try {
    const referral = await prisma.referral.create({
      data: {
        referrerName,
        referrerEmail,
        refereeName,
        refereeEmail,
      },
    });

    console.log('Referral created:', referral);

    // Send referral email
    console.log("Email User:",await process.env.EMAIL_USER);
    console.log("Email Pass:",await process.env.EMAIL_PASS ? "Loaded" : "Not Loaded");
    
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER as string,
        pass: process.env.EMAIL_PASS as string,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER as string,
      to: refereeEmail,
      subject: 'You have been referred to our course!',
      text: `Hi ${refereeName},\n\n${referrerName} has referred you to our course. Sign up now to take advantage of this referral.\n\nBest regards,\nYour Company`,
    };

    transporter.sendMail(mailOptions, (error: Error | null, info: any) => {
      if (error) {
        console.error('Error sending email:', error);
        return res.status(500).json({ error: 'Failed to send email' });
      }
      console.log('Email sent:', info.response);
      res.status(200).json({ message: 'Referral saved and email sent', referral });
    });
  } catch (error) {
    console.error('Error creating referral:', error);
    res.status(500).json({ error: 'Failed to save referral', details: (error as Error).message });
  }
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: any) => {
  console.error('Unhandled error:', err.stack);
  res.status(500).send('Something went wrong!');
});

const PORT: number = parseInt(process.env.PORT as string, 10) || 3001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
