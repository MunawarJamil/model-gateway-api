import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTemplateDto } from '../completions/dto/create-template.dto';

@Injectable()
export class TemplatesService {
  private readonly logger = new Logger(TemplatesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Extracts unique {{variable}} placeholder names from template content.
   * e.g. "Hi {{name}}, see {{context}}" -> ["name", "context"]
   */
  private extractVariables(content: string): string[] {
    const matches = content.matchAll(/\{\{\s*(\w+)\s*\}\}/g);
    const names = new Set<string>();
    for (const match of matches) {
      names.add(match[1]);
    }
    return Array.from(names);
  }

  async create(userId: string, dto: CreateTemplateDto) {
    // Derive the variable list from the content — single source of truth.
    const variables = this.extractVariables(dto.content);

    const template = await this.prisma.promptTemplate.create({
      data: {
        userId,
        name: dto.name,
        content: dto.content,
        variables,
      },
    });

    return {
      id: template.id,
      name: template.name,
      content: template.content,
      variables: template.variables,
      version: template.version,
      createdAt: template.createdAt,
    };
  }

  async findAll(userId: string) {
    const templates = await this.prisma.promptTemplate.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return templates.map((t) => ({
      id: t.id,
      name: t.name,
      content: t.content,
      variables: t.variables,
      version: t.version,
      createdAt: t.createdAt,
    }));
  }

  async findOne(userId: string, templateId: string) {
    const template = await this.prisma.promptTemplate.findUnique({
      where: { id: templateId },
    });

    // Return "not found" for both missing and unowned templates —
    // avoids leaking the existence of other users' resources.
    if (!template || template.userId !== userId) {
      throw new NotFoundException('Template not found');
    }

    return {
      id: template.id,
      name: template.name,
      content: template.content,
      variables: template.variables,
      version: template.version,
      createdAt: template.createdAt,
    };
  }
}
