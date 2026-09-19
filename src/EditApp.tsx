import World from './components/World';
import Editor from './components/Editor';

/** /edit: the content editor, over the world backdrop it always had. */
export default function EditApp() {
  return (
    <>
      <World />
      <Editor />
    </>
  );
}
