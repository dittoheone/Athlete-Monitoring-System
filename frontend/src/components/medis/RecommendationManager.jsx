// frontend/src/components/medis/RecommendationManager.jsx
import { useState, useEffect } from "react";
import { teamAPI } from "../../services/api";
import { Settings, Plus, Trash2, Save, AlertCircle } from "lucide-react";
import { useToast } from "../../hooks/useToast";

export default function RecommendationManager() {
  const [activeTab, setActiveTab] = useState("weights");
  const [criteriaWeights, setCriteriaWeights] = useState([]);
  const [recommendationRules, setRecommendationRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { addToast } = useToast();

  // Fetch real data from backend
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [weightsRes, rulesRes] = await Promise.all([
          teamAPI.getCriteriaWeights(),
          teamAPI.getRecommendationRules(),
        ]);

        // Convert weights from decimal (0.25) to percentage (25)
        setCriteriaWeights(
          weightsRes.data.map((w) => ({
            ...w,
            weight: Math.round(w.weight * 100),
          }))
        );
        setRecommendationRules(rulesRes.data);
      } catch (err) {
        addToast("Failed to load recommendation data", "error");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const positions = ["Striker", "Midfielder", "Defender", "Goalkeeper"];
  const criteriaOptions = [
    "Fleksibilitas",
    "Kekuatan",
    "Daya Tahan",
    "Kecepatan",
    "Keseimbangan",
    "Kelincahan",
    "Cedera",
    "Pemulihan",
    "Stress",
    "Motivasi",
    "Percaya Diri",
    "Kohesi Tim",
    "Fokus",
    "Rata-rata Jam Tidur",
    "Kualitas",
    "Konsistensi",
  ];

  const handleWeightChange = (id, newWeight) => {
    const weightNum = parseInt(newWeight) || 0;
    setCriteriaWeights((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, weight: weightNum } : item
      )
    );
  };

  const handleAddWeight = () => {
    const newId = Math.max(...criteriaWeights.map((w) => w.id), 0) + 1;
    setCriteriaWeights([
      ...criteriaWeights,
      {
        id: newId,
        position: "Striker",
        criteria_name: "Kecepatan",
        weight: 10,
      },
    ]);
  };

  const handleDeleteWeight = (id) => {
    setCriteriaWeights((prev) => prev.filter((item) => item.id !== id));
  };

  const handleAddRule = () => {
    const newId = Date.now(); // temporary ID, unik di client
    setRecommendationRules([
      ...recommendationRules,
      {
        id: newId,
        priority: recommendationRules.length + 1,
        trigger_condition: '{"Cedera": ">=7"}',
        recommendation_text: "",
        isNew: true, // 👈 TANDAI INI SEBAGAI BARU
      },
    ]);
  };

  const handleDeleteRule = (id) => {
    setRecommendationRules((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save criteria weights (convert % → decimal)
      await Promise.all(
        criteriaWeights.map((item) =>
          teamAPI.updateCriteriaWeight(item.id, item.weight / 100)
        )
      );

      // Simpan rules
      const savePromises = recommendationRules.map((rule) => {
        if (rule.isNew) {
          return teamAPI.createRecommendationRule(
            rule.priority,
            rule.trigger_condition,
            rule.recommendation_text
          );
        } else {
          return teamAPI.updateRecommendationRule(
            rule.id,
            rule.priority,
            rule.trigger_condition,
            rule.recommendation_text
          );
        }
      });

      await Promise.all(savePromises);

      // 🔁 SETELAH SUKSES, FETCH ULANG DATA AGAR STATE KONSISTEN
      const [weightsRes, rulesRes] = await Promise.all([
        teamAPI.getCriteriaWeights(),
        teamAPI.getRecommendationRules(),
      ]);

      setCriteriaWeights(
        weightsRes.data.map((w) => ({
          ...w,
          weight: Math.round(w.weight * 100),
        }))
      );
      setRecommendationRules(rulesRes.data); // <-- ini akan hapus semua temporary state

      addToast("Recommendation system updated successfully!", "success");
    } catch (err) {
      addToast(err.response?.data?.error || "Failed to save changes", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="p-6 bg-white rounded-lg animate-pulse">
          <div className="w-1/3 h-6 mb-4 bg-gray-200 rounded"></div>
          <div className="w-1/2 h-4 mb-2 bg-gray-200 rounded"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          Recommendation System
        </h2>
        <p className="mt-1 text-gray-600">
          Configure decision support system criteria and rules
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-6 bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="border-b border-gray-200">
          <div className="flex">
            <button
              onClick={() => setActiveTab("weights")}
              className={`px-6 py-3 font-medium text-sm border-b-2 transition ${
                activeTab === "weights"
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
            >
              Criteria Weights
            </button>
            <button
              onClick={() => setActiveTab("rules")}
              className={`px-6 py-3 font-medium text-sm border-b-2 transition ${
                activeTab === "rules"
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
            >
              Recommendation Rules
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Criteria Weights Tab */}
          {activeTab === "weights" && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-600">
                  Define importance weights for each position's criteria (total
                  should be 100%)
                </p>
                <button
                  onClick={handleAddWeight}
                  className="flex items-center px-4 py-2 space-x-2 text-white transition bg-indigo-600 rounded-lg hover:bg-indigo-700"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Weight</span>
                </button>
              </div>

              <div className="space-y-3">
                {positions.map((position) => {
                  const positionWeights = criteriaWeights.filter(
                    (w) => w.position === position
                  );
                  const totalWeight = positionWeights.reduce(
                    (sum, w) => sum + w.weight,
                    0
                  );

                  return (
                    <div
                      key={position}
                      className="p-4 border border-gray-200 rounded-lg"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-gray-900">
                          {position}
                        </h4>
                        <span
                          className={`text-sm font-medium ${
                            totalWeight === 100
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          Total: {totalWeight}%
                        </span>
                      </div>

                      <div className="space-y-2">
                        {positionWeights.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center p-3 space-x-3 rounded bg-gray-50"
                          >
                            <select
                              value={item.criteria_name}
                              onChange={(e) =>
                                setCriteriaWeights((prev) =>
                                  prev.map((w) =>
                                    w.id === item.id
                                      ? { ...w, criteria_name: e.target.value }
                                      : w
                                  )
                                )
                              }
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            >
                              {criteriaOptions.map((opt) => (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>

                            <div className="flex items-center space-x-2">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={item.weight}
                                onChange={(e) =>
                                  handleWeightChange(item.id, e.target.value)
                                }
                                className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                              />
                              <span className="text-gray-600">%</span>
                            </div>

                            <button
                              onClick={() => handleDeleteWeight(item.id)}
                              className="p-2 text-red-600 transition rounded-lg hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recommendation Rules Tab */}
          {activeTab === "rules" && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-600">
                  Define automated recommendation rules using JSON conditions
                </p>
                <button
                  onClick={handleAddRule}
                  className="flex items-center px-4 py-2 space-x-2 text-white transition bg-indigo-600 rounded-lg hover:bg-indigo-700"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Rule</span>
                </button>
              </div>

              <div className="space-y-4">
                {recommendationRules.map((rule, index) => (
                  <div
                    key={rule.id}
                    className="p-4 border border-gray-200 rounded-lg"
                  >
                    <div className="flex items-start space-x-4">
                      <div className="flex items-center justify-center flex-shrink-0 w-12 h-12 bg-indigo-100 rounded-lg">
                        <span className="font-bold text-indigo-600">
                          {index + 1}
                        </span>
                      </div>

                      <div className="flex-1 space-y-3">
                        <div>
                          <label className="block mb-2 text-sm font-medium text-gray-700">
                            Trigger Condition (JSON format)
                          </label>
                          <textarea
                            value={rule.trigger_condition}
                            onChange={(e) =>
                              setRecommendationRules((prev) =>
                                prev.map((r) =>
                                  r.id === rule.id
                                    ? {
                                        ...r,
                                        trigger_condition: e.target.value,
                                      }
                                    : r
                                )
                              )
                            }
                            rows={2}
                            className="w-full px-3 py-2 font-mono text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            placeholder='{"Cedera": ">=7", "Fleksibilitas": "<5"}'
                          />
                          <p className="mt-1 text-xs text-gray-500">
                            Use metric names like: Cedera, Fleksibilitas,
                            Stress, etc.
                          </p>
                        </div>

                        <div>
                          <label className="block mb-2 text-sm font-medium text-gray-700">
                            Recommendation Text
                          </label>
                          <textarea
                            value={rule.recommendation_text}
                            onChange={(e) =>
                              setRecommendationRules((prev) =>
                                prev.map((r) =>
                                  r.id === rule.id
                                    ? {
                                        ...r,
                                        recommendation_text: e.target.value,
                                      }
                                    : r
                                )
                              )
                            }
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            placeholder="Enter recommendation text..."
                          />
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteRule(rule.id)}
                        className="flex-shrink-0 p-2 text-red-600 transition rounded-lg hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}

                {recommendationRules.length === 0 && (
                  <div className="py-12 text-center text-gray-500">
                    <Settings className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p>No recommendation rules defined</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center px-6 py-3 space-x-2 text-white transition bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? "Saving..." : "Save Changes"}</span>
        </button>
      </div>
    </div>
  );
}
