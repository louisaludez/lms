import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole, EligibilityStatus } from './src/users/entities/user.entity';
import { Transaction, TransactionStatus, TransactionType } from './src/transactions/entities/transaction.entity';
import { BookCopy } from './src/books/entities/book-copy.entity';
import { TransactionsService } from './src/transactions/transactions.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  
  const userRepo = app.get<Repository<User>>(getRepositoryToken(User));
  const txRepo = app.get<Repository<Transaction>>(getRepositoryToken(Transaction));
  const copyRepo = app.get<Repository<BookCopy>>(getRepositoryToken(BookCopy));
  const txService = app.get(TransactionsService);

  console.log('--- STARTING OVERDUE TEST ---');

  try {
    // 1. Create a dummy student
    const student = new User();
    student.firstName = 'Test';
    student.lastName = 'Student';
    student.email = `teststudent${Date.now()}@example.com`;
    student.passwordHash = 'password123';
    student.role = UserRole.STUDENT;
    student.institutionalId = `STU-${Date.now()}`;
    student.barcode = `BAR-${Date.now()}`;
    student.isActive = true;
    student.eligibilityStatus = EligibilityStatus.ELIGIBLE;
    
    const savedStudent = (await userRepo.save(student)) as any;
    console.log(`✅ Created student: ${savedStudent.firstName} ${savedStudent.lastName} (Barcode: ${savedStudent.barcode})`);

    // 2. Find two available book copies
    const copies = await copyRepo.find({ where: { isActive: true }, relations: ['book'], take: 2 });
    if (copies.length < 2) {
      console.log('❌ Not enough active book copies in the DB to perform this test.');
      process.exit(1);
    }
    const copy1 = copies[0];
    const copy2 = copies[1];
    
    // 3. Create an OVERDUE transaction for copy1
    // We set status to ACTIVE but dueDate to the past, to test the dynamic logic
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 5); // 5 days overdue

    const tx = new Transaction();
    tx.user = savedStudent;
    tx.bookCopy = copy1;
    tx.librarian = { id: 1 } as any; // assuming admin has id 1
    tx.transactionType = TransactionType.CHECKOUT;
    tx.dueDate = pastDate.toISOString().split('T')[0];
    tx.status = TransactionStatus.ACTIVE;
    tx.notes = 'Test overdue transaction';
    await txRepo.save(tx);
    console.log(`✅ Created an active transaction for book "${copy1.book.title}" with due date ${tx.dueDate} (OVERDUE by 5 days).`);

    // 4. Test the dynamic overdue reflection (what the student sees)
    const studentActiveTxs = await txService.findActiveByUser(savedStudent.id);
    const overdueTx = studentActiveTxs.find(t => t.id === tx.id);
    console.log(`🔍 Dynamic Status Check -> Status: ${overdueTx?.status}, Fine Amount: ₱${overdueTx?.fineAmount}`);
    
    if (overdueTx?.status === TransactionStatus.OVERDUE && Number(overdueTx?.fineAmount) > 0) {
       console.log('✅ PASS: Overdue dynamically reflects correctly!');
    } else {
       console.log('❌ FAIL: Overdue did not reflect dynamically.');
    }

    // 5. Attempt to borrow another book (copy2)
    console.log(`\n⏳ Attempting to borrow another book: "${copy2.book.title}"...`);
    try {
      await txService.checkout({
        userBarcode: savedStudent.barcode,
        bookCopyBarcode: copy2.barcode,
      }, 1);
      console.log('❌ FAIL: Student was allowed to borrow the book despite having an overdue item!');
    } catch (error: any) {
      console.log('✅ PASS: Checkout was successfully rejected.');
      console.log(`   Exception Message: "${error.message}"`);
    }

  } catch (error) {
    console.error('An error occurred during testing:', error);
  } finally {
    await app.close();
  }
}

bootstrap();
