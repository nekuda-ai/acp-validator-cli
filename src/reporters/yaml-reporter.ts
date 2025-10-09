import type { Reporter, Task, File } from 'vitest';
import yaml from 'js-yaml';
import fs from 'fs/promises';
import path from 'path';

/**
 * Custom Vitest reporter that outputs test results in YAML format
 */
export default class YAMLReporter implements Reporter {
  private outputFile?: string;

  onInit(): void {
    // Get output file from environment or use default
    this.outputFile = process.env.VITEST_OUTPUT_FILE;
  }

  async onFinished(files: File[] = []): Promise<void> {
    // Collect test results
    const results = this.collectResults(files);

    // Convert to YAML
    const yamlOutput = yaml.dump(results, {
      indent: 2,
      lineWidth: 120,
      noRefs: true,
    });

    // Write to file if path specified
    if (this.outputFile) {
      await fs.mkdir(path.dirname(this.outputFile), { recursive: true });
      await fs.writeFile(this.outputFile, yamlOutput, 'utf-8');
    }
  }

  private collectResults(files: File[]) {
    const totalTests = this.countTests(files);
    const passedTests = this.countPassedTests(files);
    const failedTests = totalTests - passedTests;

    return {
      summary: {
        total: totalTests,
        passed: passedTests,
        failed: failedTests,
        success: failedTests === 0,
      },
      testFiles: files.map(file => ({
        name: file.name,
        duration: file.result?.duration || 0,
        tests: this.collectTaskResults(file.tasks),
      })),
    };
  }

  private collectTaskResults(tasks: Task[]): any[] {
    return tasks.map(task => {
      if (task.type === 'suite') {
        return {
          type: 'suite',
          name: task.name,
          tests: this.collectTaskResults(task.tasks),
        };
      }

      return {
        type: 'test',
        name: task.name,
        status: task.result?.state || 'pending',
        duration: task.result?.duration || 0,
        ...(task.result?.errors && {
          errors: task.result.errors.map(err => ({
            message: err.message,
            stack: err.stack,
          })),
        }),
      };
    });
  }

  private countTests(files: File[]): number {
    return files.reduce((sum, file) => sum + this.countTaskTests(file.tasks), 0);
  }

  private countPassedTests(files: File[]): number {
    return files.reduce((sum, file) => sum + this.countPassedTaskTests(file.tasks), 0);
  }

  private countTaskTests(tasks: Task[]): number {
    return tasks.reduce((sum, task) => {
      if (task.type === 'suite') {
        return sum + this.countTaskTests(task.tasks);
      }
      return sum + 1;
    }, 0);
  }

  private countPassedTaskTests(tasks: Task[]): number {
    return tasks.reduce((sum, task) => {
      if (task.type === 'suite') {
        return sum + this.countPassedTaskTests(task.tasks);
      }
      return sum + (task.result?.state === 'pass' ? 1 : 0);
    }, 0);
  }
}
