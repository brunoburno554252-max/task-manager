import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import Highlight from '@tiptap/extension-highlight';
import Link from '@tiptap/extension-link';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { useEffect, useCallback } from 'react';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  List, ListOrdered, CheckSquare, Quote, Code,
  AlignLeft, AlignCenter, AlignRight,
  Heading1, Heading2, Heading3,
  Link as LinkIcon, Highlighter, Undo, Redo,
  Minus,
} from 'lucide-react';

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  editable?: boolean;
  minHeight?: string;
  className?: string;
}

const MenuButton = ({ onClick, isActive, children, title }: {
  onClick: () => void;
  isActive?: boolean;
  children: React.ReactNode;
  title?: string;
}) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    className={`p-1.5 rounded transition-colors ${
      isActive
        ? 'bg-primary/20 text-primary'
        : 'text-muted-foreground hover:bg-muted/30 hover:text-foreground'
    }`}
  >
    {children}
  </button>
);

export function RichTextEditor({
  content,
  onChange,
  placeholder = 'Escreva aqui...',
  editable = true,
  minHeight = '150px',
  className = '',
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        bulletList: { keepMarks: true },
        orderedList: { keepMarks: true },
      }),
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder }),
      Highlight.configure({ multicolor: true }),
      Link.configure({
        openOnClick: !editable,
        HTMLAttributes: { class: 'text-primary underline cursor-pointer' },
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: `prose prose-sm dark:prose-invert max-w-none focus:outline-none ${editable ? '' : 'cursor-default'}`,
        style: `min-height: ${minHeight}`,
      },
    },
  });

  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      editor.setEditable(editable);
    }
  }, [editor, editable]);

  // Update content from outside only if it changed significantly
  useEffect(() => {
    if (editor && !editor.isDestroyed && !editor.isFocused) {
      const currentHTML = editor.getHTML();
      if (content !== currentHTML) {
        editor.commands.setContent(content || '');
      }
    }
  }, [content, editor]);

  const setLink = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL do link:', previousUrl);
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  if (!editor) return null;

  return (
    <div className={`border border-border/30 rounded-lg overflow-hidden bg-background ${className}`}>
      {editable && (
        <div className="flex flex-wrap items-center gap-0.5 p-1.5 border-b border-border/20 bg-muted/5">
          {/* Undo/Redo */}
          <MenuButton onClick={() => editor.chain().focus().undo().run()} title="Desfazer">
            <Undo className="h-3.5 w-3.5" />
          </MenuButton>
          <MenuButton onClick={() => editor.chain().focus().redo().run()} title="Refazer">
            <Redo className="h-3.5 w-3.5" />
          </MenuButton>

          <div className="w-px h-5 bg-border/30 mx-1" />

          {/* Headings */}
          <MenuButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            isActive={editor.isActive('heading', { level: 1 })}
            title="Título 1"
          >
            <Heading1 className="h-3.5 w-3.5" />
          </MenuButton>
          <MenuButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            isActive={editor.isActive('heading', { level: 2 })}
            title="Título 2"
          >
            <Heading2 className="h-3.5 w-3.5" />
          </MenuButton>
          <MenuButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            isActive={editor.isActive('heading', { level: 3 })}
            title="Título 3"
          >
            <Heading3 className="h-3.5 w-3.5" />
          </MenuButton>

          <div className="w-px h-5 bg-border/30 mx-1" />

          {/* Text formatting */}
          <MenuButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            isActive={editor.isActive('bold')}
            title="Negrito"
          >
            <Bold className="h-3.5 w-3.5" />
          </MenuButton>
          <MenuButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            isActive={editor.isActive('italic')}
            title="Itálico"
          >
            <Italic className="h-3.5 w-3.5" />
          </MenuButton>
          <MenuButton
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            isActive={editor.isActive('underline')}
            title="Sublinhado"
          >
            <UnderlineIcon className="h-3.5 w-3.5" />
          </MenuButton>
          <MenuButton
            onClick={() => editor.chain().focus().toggleStrike().run()}
            isActive={editor.isActive('strike')}
            title="Riscado"
          >
            <Strikethrough className="h-3.5 w-3.5" />
          </MenuButton>
          <MenuButton
            onClick={() => editor.chain().focus().toggleHighlight().run()}
            isActive={editor.isActive('highlight')}
            title="Destaque"
          >
            <Highlighter className="h-3.5 w-3.5" />
          </MenuButton>
          <MenuButton
            onClick={() => editor.chain().focus().toggleCode().run()}
            isActive={editor.isActive('code')}
            title="Código inline"
          >
            <Code className="h-3.5 w-3.5" />
          </MenuButton>

          <div className="w-px h-5 bg-border/30 mx-1" />

          {/* Alignment */}
          <MenuButton
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            isActive={editor.isActive({ textAlign: 'left' })}
            title="Alinhar à esquerda"
          >
            <AlignLeft className="h-3.5 w-3.5" />
          </MenuButton>
          <MenuButton
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            isActive={editor.isActive({ textAlign: 'center' })}
            title="Centralizar"
          >
            <AlignCenter className="h-3.5 w-3.5" />
          </MenuButton>
          <MenuButton
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            isActive={editor.isActive({ textAlign: 'right' })}
            title="Alinhar à direita"
          >
            <AlignRight className="h-3.5 w-3.5" />
          </MenuButton>

          <div className="w-px h-5 bg-border/30 mx-1" />

          {/* Lists */}
          <MenuButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            isActive={editor.isActive('bulletList')}
            title="Lista com marcadores"
          >
            <List className="h-3.5 w-3.5" />
          </MenuButton>
          <MenuButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            isActive={editor.isActive('orderedList')}
            title="Lista numerada"
          >
            <ListOrdered className="h-3.5 w-3.5" />
          </MenuButton>
          <MenuButton
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            isActive={editor.isActive('taskList')}
            title="Lista de tarefas"
          >
            <CheckSquare className="h-3.5 w-3.5" />
          </MenuButton>

          <div className="w-px h-5 bg-border/30 mx-1" />

          {/* Block elements */}
          <MenuButton
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            isActive={editor.isActive('blockquote')}
            title="Citação"
          >
            <Quote className="h-3.5 w-3.5" />
          </MenuButton>
          <MenuButton
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            isActive={editor.isActive('codeBlock')}
            title="Bloco de código"
          >
            <Code className="h-3.5 w-3.5" />
          </MenuButton>
          <MenuButton
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            title="Linha horizontal"
          >
            <Minus className="h-3.5 w-3.5" />
          </MenuButton>

          <div className="w-px h-5 bg-border/30 mx-1" />

          {/* Link */}
          <MenuButton
            onClick={setLink}
            isActive={editor.isActive('link')}
            title="Inserir link"
          >
            <LinkIcon className="h-3.5 w-3.5" />
          </MenuButton>
        </div>
      )}

      <div className={`p-3 ${editable ? '' : 'pointer-events-none'}`}>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

// Read-only viewer component for displaying formatted content
export function RichTextViewer({ content, className = '' }: { content: string; className?: string }) {
  return (
    <div
      className={`prose prose-sm dark:prose-invert max-w-none ${className}`}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}
