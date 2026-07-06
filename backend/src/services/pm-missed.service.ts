import cron from 'node-cron';
import { prisma } from './prisma';

function startOfDay(d: Date) {
  const dt = new Date(d);
  dt.setHours(0, 0, 0, 0);
  return dt;
}

function isSameDay(a: Date, b: Date) {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

export async function checkMissedPreventiveTasks() {
  const now = new Date();
  const today = startOfDay(now);
  const label = now.toISOString();

  try {
    // Fetch all tasks whose nextDue is today or earlier.
    const tasks = await prisma.preventiveTask.findMany({
      where: { nextDue: { lte: today } },
      include: { asset: true },
    });

    if (tasks.length === 0) {
      console.log(`[PM missed check ${label}] No tasks to check`);
      return;
    }

    console.log(`[PM missed check ${label}] Processing ${tasks.length} tasks...`);

    // Filter tasks that need processing (not completed on time)
    const tasksToProcess = tasks.filter(task => {
      if (!task.nextDue) return false;
      
      const scheduledDate = startOfDay(task.nextDue);
      
      // Check if completed on time
      const completedOnTime =
        task.status === 'COMPLETED' &&
        task.lastCompleted != null &&
        startOfDay(task.lastCompleted).getTime() >= scheduledDate.getTime();
      
      return !completedOnTime;
    });

    if (tasksToProcess.length === 0) {
      console.log(`[PM missed check ${label}] All tasks completed on time`);
      return;
    }

    // Batch check for existing missed records to avoid individual queries
    const existingKeys = tasksToProcess.map(task => ({
      taskId: task.id,
      scheduledDate: startOfDay(task.nextDue!)
    }));

    const existingRecords = await prisma.missedPreventiveTask.findMany({
      where: {
        OR: existingKeys.map(key => ({
          taskId: key.taskId,
          scheduledDate: key.scheduledDate
        }))
      },
      select: { taskId: true, scheduledDate: true }
    });

    const existingSet = new Set(
      existingRecords.map(r => `${r.taskId}_${r.scheduledDate.getTime()}`)
    );

    // Prepare records for batch insert
    const missedRecordsToCreate = tasksToProcess
      .filter(task => {
        const key = `${task.id}_${startOfDay(task.nextDue!).getTime()}`;
        return !existingSet.has(key);
      })
      .map(task => {
        const scheduledDate = startOfDay(task.nextDue!);
        return {
          taskId: task.id,
          assetId: task.assetId,
          title: task.title,
          description: task.description,
          assignedToName: task.assignedToName,
          assignedToId: task.assignedToId,
          frequency: task.frequency,
          scheduledDate,
          status: 'MISSED' as const,
        };
      });

    // Batch insert all missed records at once
    if (missedRecordsToCreate.length > 0) {
      // Process in batches of 100 to avoid overwhelming the database
      const batchSize = 100;
      let totalCreated = 0;
      
      for (let i = 0; i < missedRecordsToCreate.length; i += batchSize) {
        const batch = missedRecordsToCreate.slice(i, i + batchSize);
        await prisma.missedPreventiveTask.createMany({
          data: batch,
          skipDuplicates: true,
        });
        totalCreated += batch.length;
        
        // Small delay between batches to prevent overwhelming
        if (i + batchSize < missedRecordsToCreate.length) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }

      console.log(`[PM missed check ${label}] Created ${totalCreated} missed records`);
    } else {
      console.log(`[PM missed check ${label}] No new missed records to create`);
    }

    const skipped = tasksToProcess.length - missedRecordsToCreate.length;
    console.log(`[PM missed check ${label}] Summary: total=${tasks.length}, toProcess=${tasksToProcess.length}, created=${missedRecordsToCreate.length}, skipped=${skipped}`);
  } catch (err) {
    console.error(`[PM missed check ${label}] failed`, err);
  }
}

export function startPmMissedCron() {
  // Run daily at 23:59 server time
  const job = cron.schedule('59 23 * * *', checkMissedPreventiveTasks, {
    scheduled: true,
    timezone: process.env.TZ || 'Asia/Kolkata',
  });

  // Also run once on startup (non-blocking) in case the server was down at midnight.
  checkMissedPreventiveTasks().catch((err) =>
    console.error('[PM missed cron] startup check failed', err)
  );

  return job;
}
