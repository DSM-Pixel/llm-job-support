import { useRef } from 'react'
import AppShell from '../../shell/AppShell.jsx'
import { usePhoto } from './usePhoto.js'
import AnalysisControls from './components/AnalysisControls.jsx'
import ResultStage from './components/ResultStage.jsx'
import PhotoStrip from './components/PhotoStrip.jsx'
import FindingsList from './components/FindingsList.jsx'
import ContinueCards from './components/ContinueCards.jsx'

function PhotoContent() {
  const photo = usePhoto()
  const fileRef = useRef(null)

  return (
    <section className="content px-photo">
      <AnalysisControls
        modeIdx={photo.modeIdx}
        onSelectMode={photo.setModeIdx}
        prompt={photo.prompt}
        onPrompt={photo.setPrompt}
        busy={photo.busy}
        onAnalyze={photo.analyze}
      />

      <ResultStage
        mode={photo.mode}
        result={photo.result}
        busy={photo.busy}
        active={photo.active}
        onDrop={(file) => file && file.type.startsWith('image/') && photo.setPhotoFile(photo.activeIdx, file)}
        onPickActive={() => photo.requestUpload(photo.activeIdx, fileRef)}
      />

      <PhotoStrip
        photos={photo.photos}
        activeIdx={photo.activeIdx}
        busy={photo.busy}
        hasResult={!!photo.result}
        onSelect={photo.selectPhoto}
        onPick={(i) => photo.requestUpload(i, fileRef)}
      />

      <FindingsList result={photo.result} />

      <ContinueCards />

      <input
        type="file"
        accept="image/*"
        hidden
        ref={fileRef}
        onChange={() => {
          if (fileRef.current.files?.length) photo.onFileChosen(fileRef.current.files[0])
          fileRef.current.value = ''
        }}
      />

      <div className="px-bottomcta">
        <a className="btn primary grow" href="labeling.html">
          이 사진 라벨링하기
        </a>
      </div>
    </section>
  )
}

export default function PhotoPage() {
  return (
    <AppShell title="사진 분석" activeNav="photo">
      <PhotoContent />
    </AppShell>
  )
}
