import TarotCanvas from './components/scene/TarotCanvas';
import HandTracker from './components/tracking/HandTracker';
import MouseInput from './components/tracking/MouseInput';
import SplashScreen from './components/ui/SplashScreen';
import QuestionScreen from './components/ui/QuestionScreen';
import CardInfoOverlay from './components/ui/CardInfoOverlay';
import VirtualCursor from './components/ui/VirtualCursor';
import StarfieldBG from './components/ui/StarfieldBG';
import RoleBadge from './components/ui/RoleBadge';
import ResetButton from './components/ui/ResetButton';
import AISettings from './components/ui/AISettings';
import ReadingPanel from './components/ui/ReadingPanel';
import SelectionHint from './components/ui/SelectionHint';
import AdminLogin from './components/ui/AdminLogin';
import HistoryPanel from './components/ui/HistoryPanel';
import ShareButton from './components/ui/ShareButton';

export default function App() {
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black font-serif-sc">
      <StarfieldBG />

      {/* 极光层（在星空之上，3D 之下） */}
      <div className="pointer-events-none fixed inset-0 z-[1] aurora-layer" />
      <div className="pointer-events-none fixed inset-0 z-[1] aurora-layer-2" />
      {/* 暗角 */}
      <div className="pointer-events-none fixed inset-0 z-[2] vignette" />

      <div className="absolute inset-0">
        <TarotCanvas />
      </div>

      <CardInfoOverlay />
      <SelectionHint />

      {/* 阶段性覆盖层 */}
      <SplashScreen />
      <QuestionScreen />
      <ReadingPanel />

      <VirtualCursor />
      <HandTracker />
      <MouseInput />

      {/* 顶部控件 */}
      <RoleBadge />
      <ResetButton />
      <AISettings />

      {/* 底部控件 */}
      <HistoryPanel />
      <ShareButton />

      {/* 管理员（含隐形角落触发 + 登录框） */}
      <AdminLogin />
    </div>
  );
}
