import ReactMarkdown from 'react-markdown';
import { jsPDF } from 'jspdf';
import { marked } from 'marked';
import './Stage3.css';

export default function Stage3({ finalResponse }) {
  if (!finalResponse) {
    return null;
  }

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const maxWidth = pageWidth - 2 * margin;
    let yPosition = margin;

    // Helper function to check if we need a new page
    const checkPageBreak = (requiredSpace = 10) => {
      if (yPosition + requiredSpace > pageHeight - margin) {
        doc.addPage();
        yPosition = margin;
        return true;
      }
      return false;
    };

    // Helper function to render text with inline formatting
    const renderFormattedText = (tokens, baseFontSize = 11, xOffset = 0) => {
      if (!tokens || tokens.length === 0) return;
      
      // Build text segments with formatting info
      const segments = [];
      tokens.forEach((token) => {
        let text = '';
        let fontStyle = 'normal';
        let textColor = [0, 0, 0];
        
        switch (token.type) {
          case 'strong':
            text = token.text || '';
            fontStyle = 'bold';
            break;
          case 'em':
            text = token.text || '';
            fontStyle = 'italic';
            break;
          case 'code':
            text = token.text || '';
            textColor = [100, 100, 100];
            break;
          case 'text':
            text = token.text || '';
            break;
          case 'link':
            text = token.text || token.href || '';
            break;
          default:
            text = token.raw || token.text || '';
        }

        if (text) {
          segments.push({ text, fontStyle, textColor });
        }
      });

      // Render segments with proper word wrapping
      let currentX = margin + xOffset;
      doc.setFontSize(baseFontSize);
      
      segments.forEach((segment) => {
        doc.setFont(undefined, segment.fontStyle);
        doc.setTextColor(...segment.textColor);
        
        // Split segment text into words
        const words = segment.text.split(' ');
        
        words.forEach((word, wordIndex) => {
          const wordWithSpace = wordIndex > 0 ? ' ' + word : word;
          const wordWidth = doc.getTextWidth(wordWithSpace);
          
          // Check if word fits on current line
          if (currentX + wordWidth > pageWidth - margin) {
            yPosition += 5;
            currentX = margin + xOffset;
            checkPageBreak(5);
          }
          
          doc.text(wordWithSpace, currentX, yPosition);
          currentX += wordWidth;
        });
      });
      
      // Reset to defaults
      doc.setTextColor(0, 0, 0);
      doc.setFont(undefined, 'normal');
      yPosition += 5;
    };

    // Helper function to get plain text from tokens
    const getTextFromTokens = (tokens) => {
      if (!tokens) return '';
      return tokens.map(t => t.text || t.raw || '').join('');
    };

    // Add title
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text('LLM Council - Final Answer', margin, yPosition);
    yPosition += 10;

    // Add chairman info
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    const chairmanText = `Chairman: ${finalResponse.model.split('/')[1] || finalResponse.model}`;
    doc.text(chairmanText, margin, yPosition);
    yPosition += 10;

    // Add separator
    doc.setDrawColor(200, 230, 200);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 10;

    // Parse markdown and render formatted content
    const markdownText = finalResponse.response;
    const tokens = marked.lexer(markdownText);

    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(0, 0, 0);

    tokens.forEach((token) => {
      checkPageBreak(5);

      switch (token.type) {
        case 'heading':
          const headingSize = Math.max(14 - token.depth, 10);
          doc.setFontSize(headingSize);
          doc.setFont(undefined, 'bold');
          const headingText = token.tokens ? getTextFromTokens(token.tokens) : token.text;
          const headingLines = doc.splitTextToSize(headingText, maxWidth);
          headingLines.forEach((line) => {
            checkPageBreak(headingSize * 0.5);
            doc.text(line, margin, yPosition);
            yPosition += headingSize * 0.5;
          });
          yPosition += 3;
          doc.setFontSize(11);
          doc.setFont(undefined, 'normal');
          break;

        case 'paragraph':
          if (token.tokens && token.tokens.length > 0) {
            renderFormattedText(token.tokens, 11, 0);
          } else {
            const paraLines = doc.splitTextToSize(token.text || '', maxWidth);
            paraLines.forEach((line) => {
              checkPageBreak(5);
              doc.text(line, margin, yPosition);
              yPosition += 5;
            });
          }
          yPosition += 3;
          break;

        case 'list':
          token.items.forEach((item, index) => {
            checkPageBreak(6);
            const prefix = token.ordered ? `${index + 1}. ` : '• ';
            
            doc.setFont(undefined, 'normal');
            doc.text(prefix, margin, yPosition);
            
            const itemText = item.tokens 
              ? getTextFromTokens(item.tokens)
              : (item.text || '');
            
            const itemLines = doc.splitTextToSize(itemText, maxWidth - 15);
            itemLines.forEach((line, lineIndex) => {
              if (lineIndex > 0) {
                checkPageBreak(5);
              }
              doc.text(line, margin + 10, yPosition);
              yPosition += 5;
            });
            yPosition += 2;
          });
          yPosition += 3;
          break;

        case 'code':
          doc.setFont(undefined, 'normal');
          doc.setTextColor(50, 50, 50);
          const codeLines = token.text.split('\n');
          codeLines.forEach((line) => {
            checkPageBreak(5);
            doc.text(line || ' ', margin + 5, yPosition);
            yPosition += 5;
          });
          doc.setTextColor(0, 0, 0);
          yPosition += 3;
          break;

        case 'blockquote':
          doc.setDrawColor(200, 200, 200);
          doc.line(margin, yPosition - 2, margin, yPosition + 10);
          const quoteText = token.tokens ? getTextFromTokens(token.tokens) : token.text;
          doc.setFont(undefined, 'italic');
          const quoteLines = doc.splitTextToSize(quoteText, maxWidth - 10);
          quoteLines.forEach((line) => {
            checkPageBreak(5);
            doc.text(line, margin + 10, yPosition);
            yPosition += 5;
          });
          doc.setFont(undefined, 'normal');
          yPosition += 3;
          break;

        case 'hr':
          checkPageBreak(5);
          doc.setDrawColor(200, 200, 200);
          doc.line(margin, yPosition, pageWidth - margin, yPosition);
          yPosition += 10;
          break;

        default:
          if (token.text) {
            const lines = doc.splitTextToSize(token.text, maxWidth);
            lines.forEach((line) => {
              checkPageBreak(5);
              doc.text(line, margin, yPosition);
              yPosition += 5;
            });
          }
      }
    });

    // Add timestamp
    const timestamp = new Date().toLocaleString();
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.setFont(undefined, 'normal');
    const footerText = `Generated on ${timestamp}`;
    doc.text(footerText, margin, pageHeight - 10);

    // Save the PDF
    const filename = `llm-council-answer-${Date.now()}.pdf`;
    doc.save(filename);
  };

  return (
    <div className="stage stage3">
      <div className="stage-header">
        <h3 className="stage-title">Stage 3: Final Council Answer</h3>
        <button 
          className="export-pdf-btn" 
          onClick={handleExportPDF}
          title="Export to PDF"
        >
          <svg 
            width="14" 
            height="14" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          Export PDF
        </button>
      </div>
      <div className="final-response">
        <div className="chairman-label">
          Chairman: {finalResponse.model.split('/')[1] || finalResponse.model}
        </div>
        <div className="final-text markdown-content">
          <ReactMarkdown>{finalResponse.response}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
