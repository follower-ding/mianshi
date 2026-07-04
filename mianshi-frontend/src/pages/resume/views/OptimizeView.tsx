import { ImportWizard } from '../../../components/resume/ImportWizard'
import { resumeUi } from '../../../components/resume/resumeLayout'
import { useResume } from '../ResumeProvider'

export function OptimizeView() {
  const {
    pasteText,
    setPasteText,
    jobs,
    selectedJobId,
    setSelectedJobId,
    extracting,
    processing,
    optimizing,
    handleExtractFile,
    fetchParseCompare,
    applyParseCompare,
    fetchFullOptimizeCompare,
    applyOptimizeCompare,
    success,
    extractErrorCode,
  } = useResume()

  return (
    <div className={resumeUi.moduleMain}>
      <div className={resumeUi.wizardScroll}>
        <ImportWizard
          pasteText={pasteText}
          setPasteText={setPasteText}
          jobs={jobs}
          selectedJobId={selectedJobId}
          setSelectedJobId={setSelectedJobId}
          extracting={extracting}
          parsing={processing}
          optimizing={optimizing}
          onExtractFile={handleExtractFile}
          onFetchParseCompare={fetchParseCompare}
          onApplyParseCompare={applyParseCompare}
          onFullOptimize={fetchFullOptimizeCompare}
          onApplyOptimizeCompare={(payload) => applyOptimizeCompare(payload, { navigateToEdit: true })}
          success={success}
          extractErrorCode={extractErrorCode}
        />
      </div>
    </div>
  )
}
