import { useState } from "react";

interface FormValues {
  title: string;
  content: string;
  nickname: string;
}

const INITIAL_FORM: FormValues = {
  title: "",
  content: "",
  nickname: "",
};

export default function FeedbackWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [formValues, setFormValues] = useState<FormValues>(INITIAL_FORM);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [message, setMessage] = useState<string>("");

  const handleChange = (field: keyof FormValues) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setFormValues((prev) => ({ ...prev, [field]: event.target.value }));
    };

  const resetForm = () => {
    setFormValues(INITIAL_FORM);
    setStatus("idle");
    setMessage("");
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("submitting");
    setMessage("");

    try {
      const formData = new FormData();
      formData.append("form-name", "feedback");
      formData.append("payload", JSON.stringify(formValues));
      formData.append("bot-field", "");

      const response = await fetch("/", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      setStatus("success");
      setMessage("소중한 의견 감사합니다! 🙌");
      setFormValues(INITIAL_FORM);
    } catch (error) {
      setStatus("error");
      setMessage(`제출에 실패했습니다: ${(error as Error).message}`);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setIsOpen(true);
          setStatus("idle");
          setMessage("");
        }}
        className="fixed right-4 bottom-4 md:right-8 md:bottom-8 z-40 bg-amber-400 text-gray-900 font-semibold px-4 py-3 rounded-full shadow-lg hover:bg-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-300"
      >
        ⚡ 의견 남기기
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-800">스티커 메모 남기기</h2>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  resetForm();
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700" htmlFor="feedback-title">
                  제목
                </label>
                <input
                  id="feedback-title"
                  required
                  maxLength={80}
                  value={formValues.title}
                  onChange={handleChange("title")}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  placeholder="어떤 내용을 남기고 싶나요?"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700" htmlFor="feedback-content">
                  내용
                </label>
                <textarea
                  id="feedback-content"
                  required
                  rows={4}
                  maxLength={500}
                  value={formValues.content}
                  onChange={handleChange("content")}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  placeholder="불편했던 점이나 개선 아이디어를 자유롭게 적어주세요."
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700" htmlFor="feedback-nickname">
                  닉네임 (선택)
                </label>
                <input
                  id="feedback-nickname"
                  maxLength={40}
                  value={formValues.nickname}
                  onChange={handleChange("nickname")}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  placeholder="익명"
                />
              </div>

              {status !== "idle" && message && (
                <p
                  className={`text-sm ${
                    status === "success" ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {message}
                </p>
              )}

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    resetForm();
                  }}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                >
                  닫기
                </button>
                <button
                  type="submit"
                  disabled={status === "submitting"}
                  className="px-4 py-2 bg-amber-400 hover:bg-amber-500 disabled:bg-amber-200 text-gray-900 rounded-md text-sm font-semibold"
                >
                  {status === "submitting" ? "전송 중..." : "메모 남기기"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
