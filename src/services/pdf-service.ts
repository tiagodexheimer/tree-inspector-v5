import { jsPDF } from "jspdf";
import { CampoDef, CampoOpcao } from '@/types/formularios';

export interface RouteExportData {
    rotaNome: string;
    demandas: any[];
}

export class PdfService {
    async generatePrintableRoute(data: RouteExportData): Promise<Buffer> {
        const doc = new jsPDF({
            orientation: "p",
            unit: "mm",
            format: "a4"
        });

        // --- PÁGINA 1: ROTEIRO ---
        let currentY = this.generateItineraryPage(doc, data);

        // --- PÁGINAS SEGUINTES: FORMULÁRIOS ---
        for (const demanda of data.demandas) {
            // Se houver pouco espaço (menos de 60mm), começa em nova página para não quebrar o cabeçalho
            if (currentY > 230) {
                doc.addPage();
                currentY = 20;
            } else if (currentY > 20) {
                // Separador entre demandas na mesma página
                currentY += 5;
                doc.setDrawColor(200);
                doc.setLineDashPattern([2, 1], 0);
                doc.line(10, currentY, 200, currentY);
                doc.setLineDashPattern([], 0);
                doc.setDrawColor(0);
                currentY += 10;
            }

            currentY = this.generateFormPage(doc, demanda, currentY);
        }

        return Buffer.from(doc.output('arraybuffer'));
    }

    private generateItineraryPage(doc: jsPDF, data: RouteExportData): number {
        const pageWidth = doc.internal.pageSize.getWidth();
        let y = 20;

        doc.setFont("helvetica", "bold");
        doc.setFontSize(22);
        doc.text('Roteiro de Vistoria', pageWidth / 2, y, { align: 'center' });
        y += 15;

        doc.setFontSize(14);
        doc.text(`Rota: ${data.rotaNome}`, 20, y);
        y += 7;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        doc.text(`Data de Exportação: ${new Date().toLocaleDateString('pt-BR')}`, 20, y);
        y += 15;

        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text('Endereços Programados:', 20, y);
        y += 10;

        data.demandas.forEach((d, index) => {
            if (y > 270) {
                doc.addPage();
                y = 20;
            }

            const address = `${d.logradouro}, ${d.numero}${d.bairro ? ` - ${d.bairro}` : ''}`;

            doc.rect(20, y - 4, 4, 4);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(11);
            doc.text(`${index + 1}. ${address}`, 26, y);
            y += 5;

            doc.setFontSize(9);
            doc.setTextColor(80);
            doc.text(`ID: ${d.id} | Protocolo: ${d.protocolo || 'N/A'} | Tipo: ${d.tipo_demanda}`, 26, y);
            doc.setTextColor(0);
            y += 8;
        });

        return y;
    }

    private generateFormPage(doc: jsPDF, demanda: any, startY: number): number {
        const pageWidth = doc.internal.pageSize.getWidth();
        let y = startY;

        // Cabeçalho da Demanda
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.text(`Protocolo: ${demanda.protocolo || demanda.id}`, 20, y);
        doc.setFontSize(10);
        doc.text(`ID Interno: ${demanda.id}`, pageWidth - 20, y, { align: 'right' });
        y += 7;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        doc.text(`${demanda.logradouro}, ${demanda.numero}${demanda.bairro ? ` - ${demanda.bairro}` : ''}`, 20, y);
        y += 5;
        doc.setFontSize(9);
        doc.text(`Tipo: ${demanda.tipo_demanda} | Status Atual: ${demanda.status_nome}`, 20, y);
        y += 6;

        doc.line(20, y, 190, y);
        y += 6;

        // Solicitação Original (Mais compacta)
        if (demanda.descricao) {
            doc.setFont("helvetica", "bold");
            doc.setFontSize(9);
            doc.text("Descrição da Solicitação:", 20, y);
            y += 4;
            doc.setFont("helvetica", "normal");
            const splitDesc = doc.splitTextToSize(demanda.descricao, 170);
            doc.text(splitDesc, 20, y);
            y += (splitDesc.length * 4) + 4;
        }

        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.text(`Solicitante: ${demanda.nome_solicitante || 'N/A'} - ${demanda.telefone_solicitante || 'N/A'}`, 20, y);
        y += 6;

        doc.line(20, y, 190, y);
        y += 8;

        // Dados de Campo (Vistoria)
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text("DADOS DE CAMPO", 20, y);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.text('Data: ____/____/_______ Técnico: _________________________', 190, y, { align: 'right' });
        y += 8;

        // Campos do Formulário
        const camposRaw = demanda.form_definicao;
        let campos: CampoDef[] = [];

        try {
            if (camposRaw) {
                campos = typeof camposRaw === 'string' ? JSON.parse(camposRaw) : camposRaw;
            } else {
                campos = [
                    { id: 'obs', name: 'observacoes', type: 'textarea', label: 'Relatório Técnico / Observações', required: true } as CampoDef
                ];
            }
        } catch (e) {
            console.error("Erro ao parsear campos do formulário no PDF:", e);
        }

        campos.forEach(campo => {
            y = this.renderField(doc, campo, y, demanda.protocolo || demanda.id);
        });

        return y + 10;
    }

    private renderField(doc: jsPDF, campo: CampoDef, y: number, protocolo: string): number {
        const margin = 20;
        const width = 170;

        // Check if we need a new page
        if (y > 270 && campo.type !== 'header' && campo.type !== 'separator') {
            doc.addPage();
            y = 20;
            doc.setFont("helvetica", "bold");
            doc.setFontSize(10);
            doc.text(`Continuação - Protocolo: ${protocolo}`, margin, y);
            y += 10;
        }

        if (campo.type === 'header') {
            y += 5;
            doc.setFont("helvetica", "bold");
            doc.setFontSize(11);
            doc.text(campo.label.toUpperCase(), margin, y);
            doc.setFont("helvetica", "normal");
            y += 6;
            return y;
        }

        if (campo.type === 'separator') {
            y += 2;
            doc.line(margin, y, margin + width, y);
            y += 5;
            return y;
        }

        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text(campo.label + (campo.required ? ' *' : ''), margin, y);
        doc.setFont("helvetica", "normal");
        y += 4;

        switch (campo.type) {
            case 'text':
            case 'email':
            case 'date':
            case 'number':
            case 'password':
            case 'tree_species':
                doc.rect(margin, y, width, 7);
                y += 11;
                break;

            case 'textarea':
                const rows = (campo as any).rows || 3; // Reduzido padrão para economizar espaço
                doc.rect(margin, y, width, rows * 8);
                y += (rows * 8) + 5;
                break;

            case 'checkbox':
            case 'switch':
                doc.rect(margin, y, 4, 4);
                doc.text('( ) Sim   ( ) Não', margin + 6, y + 3.5);
                y += 8;
                break;

            case 'select':
            case 'radio':
            case 'checkbox_group':
                const options = (campo as any).options as CampoOpcao[] || [];
                options.forEach(opt => {
                    if (y > 280) {
                        doc.addPage();
                        y = 20;
                    }
                    doc.rect(margin + 2, y, 3, 3);
                    doc.text(opt.label, margin + 7, y + 2.5);
                    y += 5;
                });
                y += 2;
                break;

            case 'file':
                doc.setFontSize(8);
                doc.text('[ ] Foto 1  [ ] Foto 2  [ ] Foto 3  [ ] Foto 4  [ ] Foto 5  [ ] Foto 6', margin + 5, y + 3);
                y += 8;
                break;
        }

        return y;
    }
}

export const pdfService = new PdfService();
