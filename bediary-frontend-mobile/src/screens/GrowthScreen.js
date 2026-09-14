import { useAuth } from "../utils/auth";
import { useCallback, useMemo, useRef, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, TextInput, View } from 'react-native';
import FormSheet from '../components/FormSheet';
import { AppAlert as Alert } from '../utils/appAlert';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import PrimaryButton from '../components/PrimaryButton';
import EmptyState from '../components/EmptyState';
import { growthApi } from '../api/api';
import { colors } from '../theme/colors';
import { styles } from '../theme/styles';
import { formatDate, listFromResponse, unwrap } from '../utils/format';
import { measurement, measurementLabel, timePosition, labelLeft } from '../utils/growthPresentation.mjs';
const STATUS = {
  NORMAL: {
    label: 'Bình thường',
    bg: colors.successBg,
    color: '#18794E',
    icon: 'checkmark-circle-outline'
  },
  UNDERWEIGHT: {
    label: 'Thiếu cân',
    bg: colors.warningBg,
    color: '#B76700',
    icon: 'warning-outline'
  },
  SEVERELY_UNDERWEIGHT: {
    label: 'Suy dinh dưỡng',
    bg: colors.dangerBg,
    color: '#C9335C',
    icon: 'alert-circle-outline'
  },
  OVERWEIGHT: {
    label: 'Thừa cân',
    bg: colors.dangerBg,
    color: '#C9335C',
    icon: 'warning-outline'
  },
  SHORT: {
    label: 'Thấp',
    bg: colors.warningBg,
    color: '#B76700',
    icon: 'warning-outline'
  },
  TALL: {
    label: 'Chiều cao vượt trội',
    bg: colors.successBg,
    color: '#18794E',
    icon: 'checkmark-circle-outline'
  }
};
function statusOf(key) {
  return STATUS[key] || {
    label: 'Chưa đánh giá',
    bg: colors.surface2,
    color: colors.text2,
    icon: 'help-circle-outline'
  };
}
function plainText(status, percentile) {
  if (!STATUS[status]) return 'Chưa đủ dữ liệu để đánh giá';
  if (percentile == null || String(percentile).trim() === '') return 'Chưa có dữ liệu bách phân vị';
  const value = Number(percentile);
  if (status === 'SEVERELY_UNDERWEIGHT') return 'Thấp hơn nhiều so với vùng thường gặp';
  if (status === 'UNDERWEIGHT' || status === 'SHORT') return 'Thấp hơn vùng thường gặp theo tuổi';
  if (status === 'OVERWEIGHT' || status === 'TALL') return 'Cao hơn đa số bé cùng tuổi';
  if (Number.isFinite(value) && value >= 97) return 'Cao hơn đa số bé cùng tuổi';
  if (Number.isFinite(value) && value <= 3) return 'Thấp hơn vùng thường gặp theo tuổi';
  return 'Trong vùng phù hợp theo tuổi';
}
export default function GrowthScreen() {
  const canWrite = ["ADMIN", "PARENT"].includes(useAuth().user?.role);
  const [tab, setTab] = useState('weight');
  const [latest, setLatest] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyPage, setHistoryPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [nutrition, setNutrition] = useState({
    basis: '',
    items: []
  });
  const [refreshing, setRefreshing] = useState(false);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const mutation = useRef(false);
  const [showChart, setShowChart] = useState(false);
  const [form, setForm] = useState({
    weightKg: '',
    heightCm: ''
  });
  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const [latestRes, historyRes, nutritionRes] = await Promise.allSettled([growthApi.latest(), growthApi.history(0), growthApi.nutritionSuggestions()]);
      if (latestRes.status === 'fulfilled') setLatest(unwrap(latestRes.value));
      if (historyRes.status === 'fulfilled') {
        const rows = listFromResponse(historyRes.value);
        setHistory(rows);
        setHistoryPage(0);
        setHasMore(rows.length === 20);
      }
      if (nutritionRes.status === 'fulfilled') {
        const data = unwrap(nutritionRes.value);
        setNutrition({
          basis: data?.basis || '',
          items: Array.isArray(data?.items) ? data.items : []
        });
      }
    } finally {
      setRefreshing(false);
    }
  }, []);
  useFocusEffect(useCallback(() => {
    load();
  }, [load]));
  const sorted = useMemo(() => [...history].sort((a, b) => new Date(b.recordedAt) - new Date(a.recordedAt)), [history]);
  const currentValue = measurement(tab === 'weight' ? latest?.weightKg : latest?.heightCm);
  const currentUnit = tab === 'weight' ? 'kg' : 'cm';
  async function save() {
    if (!canWrite || mutation.current) return;
    const weight = Number(form.weightKg.trim().replace(',', '.'));
    const height = Number(form.heightCm.trim().replace(',', '.'));
    const hasWeight = form.weightKg.trim() !== '';
    const hasHeight = form.heightCm.trim() !== '';
    if ((!hasWeight && !hasHeight) || (hasWeight && (!Number.isFinite(weight) || weight < 0.5 || weight > 100)) || (hasHeight && (!Number.isFinite(height) || height < 30 || height > 200))) {
      Alert.alert('Thiếu chỉ số', 'Nhập ít nhất một chỉ số hợp lệ.');
      return;
    }
    mutation.current = true;
    setBusy(true);
    try {
      const payload = {
        weightKg: hasWeight ? weight : null,
        heightCm: hasHeight ? height : null
      };
      if (editing) await growthApi.update(editing.id, payload);
      else await growthApi.record(payload);
      setModal(false);
      setForm({
        weightKg: '',
        heightCm: ''
      });
      await load();
    } catch (error) {
      Alert.alert('Không thể lưu', error.response?.data?.message || 'Thử lại sau nhé.');
    } finally {
      mutation.current = false;
      setBusy(false);
    }
  }
  function openForm(item = null) {
    if (!canWrite || mutation.current) return;
    setEditing(item);
    setForm({ weightKg: item?.weightKg == null ? '' : String(item.weightKg), heightCm: item?.heightCm == null ? '' : String(item.heightCm) });
    setModal(true);
  }
  function confirmDelete(item) {
    if (!canWrite || mutation.current) return;
    Alert.alert('Xóa lần đo?', `Xóa cả cân nặng và chiều cao của lần đo ngày ${formatDate(item.recordedAt)}. Thao tác này không thể hoàn tác.`, [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Xóa', style: 'destructive', onPress: async () => {
        if (mutation.current) return;
        mutation.current = true;
        setBusy(true);
        try {
          await growthApi.remove(item.id);
          setHistory(current => current.filter(row => row.id !== item.id));
          setLatest(current => current?.id === item.id ? null : current);
          await load();
        } catch (error) {
          Alert.alert('Không thể xóa', error.response?.data?.message || 'Vui lòng thử lại.');
        } finally {
          mutation.current = false;
          setBusy(false);
        }
      } }
    ]);
  }
  return <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.page} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={colors.primary} />}>
        <View style={{
        marginBottom: 20
      }}>
          <Text style={[styles.title, {
          flexDirection: 'row'
        }]}>Theo dõi phát triển</Text>
          <Text style={styles.subtitle}>Chuẩn WHO · 0-60 tháng tuổi</Text>
        </View>

        <View style={{
        flexDirection: 'row',
        backgroundColor: '#EFEFEF',
        borderRadius: 999,
        padding: 4,
        marginBottom: 24,
        gap: 4
      }}>
          {[{
          key: 'weight',
          label: 'Cân nặng',
          icon: 'scale-outline'
        }, {
          key: 'height',
          label: 'Chiều cao',
          icon: 'resize-outline'
        }].map(item => <Pressable key={item.key} onPress={() => {
          setTab(item.key);
          setShowChart(false);
        }} style={{
          flex: 1,
          height: 42,
          borderRadius: 999,
          backgroundColor: tab === item.key ? '#fff' : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: 6
        }}>
              <Ionicons name={item.icon} size={15} color={tab === item.key ? colors.primary : colors.hint} />
              <Text style={{
            color: tab === item.key ? colors.primary : colors.hint,
            fontWeight: '900'
          }}>{item.label}</Text>
            </Pressable>)}
        </View>

        <View style={{
        backgroundColor: colors.surface,
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
        borderColor: '#FFE0EB',
        marginBottom: 16,
        shadowColor: colors.primary,
        shadowOpacity: 0.1,
        shadowRadius: 18,
        shadowOffset: {
          width: 0,
          height: 8
        },
        elevation: 2
      }}>
          <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-start'
        }}>
            <View style={{
            flex: 1
          }}>
              <Text style={{
              color: colors.hint,
              fontSize: 13,
              fontWeight: '800'
            }}>{tab === 'weight' ? 'Cân nặng hiện tại' : 'Chiều cao hiện tại'}</Text>
              {currentValue != null ? <>
                  <Text style={{
                marginTop: 10,
                color: colors.text,
                fontSize: 52,
                fontWeight: '900',
                lineHeight: 58
              }}>
                    {Number(currentValue).toFixed(1)}
                    <Text style={{
                  color: colors.text2,
                  fontSize: 20
                }}> {currentUnit}</Text>
                  </Text>
                  <Text style={{
                marginTop: 4,
                color: colors.hint,
                fontSize: 11
              }}>Ngày {formatDate(latest?.recordedAt)}</Text>
                </> : <Text style={{
              marginTop: 14,
              color: colors.hint,
              fontSize: 15
            }}>Chưa có dữ liệu</Text>}
            </View>
            <Text style={{
            fontSize: 58
          }}>{tab === 'weight' ? '⚖️' : '📏'}</Text>
          </View>
        </View>

        {latest ? <StatusBlock latest={latest} /> : null}

        <View style={{
        marginBottom: 20
      }}>
          <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12
        }}>
            <Text style={[styles.sectionTitle, {
            fontSize: 15
          }]}>Biểu đồ tăng trưởng</Text>
            <Pressable onPress={() => setShowChart(value => !value)} style={{
            borderRadius: 999,
            paddingHorizontal: 12,
            paddingVertical: 7,
            backgroundColor: colors.primaryLight
          }}>
              <Text style={{
              color: colors.primary,
              fontSize: 12,
              fontWeight: '900'
            }}>{showChart ? 'Ẩn' : 'Xem biểu đồ'}</Text>
            </Pressable>
          </View>
          {showChart ? <MiniChart history={history} tab={tab} /> : null}
        </View>

        <View style={{
        marginBottom: 22
      }}>
          <Text style={[styles.sectionTitle, {
          fontSize: 15,
          marginBottom: 12
        }]}>Gợi ý dinh dưỡng</Text>
          {nutrition.basis ? <Text style={{
          marginTop: -4,
          marginBottom: 12,
          color: colors.hint,
          fontSize: 12,
          lineHeight: 18
        }}>{nutrition.basis}</Text> : null}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{
          gap: 10,
          paddingBottom: 4
        }}>
            {nutrition.items.length ? nutrition.items.slice(0, 8).map(item => <NutritionCard key={`${item.iconKey}-${item.name}`} item={item} />) : <NutritionCard item={{
            name: 'Theo dõi bữa ăn',
            category: 'Gợi ý',
            reason: 'Nhập thêm cân nặng, chiều cao để Bediary gợi ý phù hợp hơn.',
            servingNote: 'Cập nhật đều mỗi tháng.'
          }} />}
          </ScrollView>
        </View>

        <View>
          <Text style={[styles.sectionTitle, {
          fontSize: 15,
          marginBottom: 12
        }]}>Lịch sử {tab === 'weight' ? 'cân nặng' : 'chiều cao'}</Text>
          <View style={[styles.card, {
          padding: 0,
          overflow: 'hidden'
        }]}>
            {sorted.length ? sorted.map((item, index) => <View key={item.id || index}>
              <HistoryRow item={item} tab={tab} isLast={index === sorted.length - 1} />
              {canWrite && item.id ? <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 14, gap: 16 }}>
                <Pressable disabled={busy} onPress={() => openForm(item)} accessibilityRole="button" style={{ padding: 12 }}><Text style={{ color: colors.primary }}>Chỉnh sửa</Text></Pressable>
                <Pressable disabled={busy} onPress={() => confirmDelete(item)} accessibilityRole="button" style={{ padding: 12 }}><Text style={{ color: '#C9335C' }}>Xóa</Text></Pressable>
              </View> : null}
            </View>) : <EmptyState icon="📊" title="Chưa có dữ liệu" description="Nhấn nút bên dưới để cập nhật chỉ số đầu tiên." />}
          </View>
        </View>

        {hasMore ? <PrimaryButton disabled={busy || refreshing} onPress={async () => {
          try {
            const rows = listFromResponse(await growthApi.history(historyPage + 1));
            setHistory(current => [...current, ...rows.filter(row => !current.some(old => old.id === row.id))]);
            setHistoryPage(page => page + 1);
            setHasMore(rows.length === 20);
          } catch { Alert.alert('Không thể tải lịch sử', 'Vui lòng thử lại.'); }
        }}>Xem lần đo cũ hơn</PrimaryButton> : null}
        {canWrite ? <PrimaryButton disabled={busy} onPress={() => openForm()} style={{
        marginTop: 22,
        height: 54
      }}>
          Cập nhật {tab === 'weight' ? 'cân nặng' : 'chiều cao'}
        </PrimaryButton> : null}
      </ScrollView>

      <FormSheet visible={canWrite && modal} onClose={() => { if (!mutation.current) setModal(false); }}>
            <View style={{
        width: 44,
        height: 5,
        borderRadius: 999,
        backgroundColor: '#EADDE4',
        alignSelf: 'center',
        marginBottom: 18
      }} />
            <Text style={{
        fontSize: 18,
        fontWeight: '900',
        color: colors.text
      }}>{editing ? `Chỉnh sửa lần đo · ${formatDate(editing.recordedAt)}` : 'Thêm lần đo'}</Text>
            <TextInput placeholderTextColor="#787078" placeholder="Cân nặng (kg)" keyboardType="numeric" value={form.weightKg} onChangeText={weightKg => setForm({
        ...form,
        weightKg
      })} style={[styles.input, {
        marginTop: 14
      }]} />
            <TextInput placeholderTextColor="#787078" placeholder="Chiều cao (cm)" keyboardType="numeric" value={form.heightCm} onChangeText={heightCm => setForm({
        ...form,
        heightCm
      })} style={[styles.input, {
        marginTop: 10
      }]} />
            <View style={{
        backgroundColor: colors.primaryPale,
        borderRadius: 12,
        padding: 12,
        marginTop: 12
      }}>
              <Text style={{
          color: colors.primary,
          fontSize: 11,
          lineHeight: 16
        }}>Bediary tự động phân tích theo chuẩn WHO đối với tuổi và giới tính của bé.</Text>
            </View>
            <PrimaryButton loading={busy} onPress={save} style={{
        marginTop: 16
      }}>Lưu chỉ số</PrimaryButton>
            <Text onPress={() => { if (!mutation.current) setModal(false); }} style={{
        textAlign: 'center',
        marginTop: 14,
        color: colors.hint,
        fontWeight: '800'
      }}>Hủy</Text>
      </FormSheet>
    </View>;
}
function StatusBlock({
  latest
}) {
  const weightStatus = measurement(latest?.weightKg) === null ? null : latest?.weightStatus;
  const heightStatus = measurement(latest?.heightCm) === null ? null : latest?.heightStatus;
  const weight = statusOf(weightStatus);
  const height = statusOf(heightStatus);
  return <View style={[styles.card, {
    padding: 0,
    overflow: 'hidden',
    marginBottom: 16
  }]}>
      <View style={{
      paddingHorizontal: 18,
      paddingVertical: 14,
      backgroundColor: colors.primaryPale,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderSoft,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10
    }}>
        <Ionicons name="pulse-outline" size={18} color={colors.primary} />
        <Text style={{
        color: colors.text,
        fontSize: 14,
        fontWeight: '900'
      }}>Đánh giá theo chuẩn WHO</Text>
      </View>
      <View style={{
      flexDirection: 'row'
    }}>
        <StatusCell title="Cân nặng" icon="scale-outline" info={weight} text={plainText(weightStatus, latest.weightPercentile)} bordered />
        <StatusCell title="Chiều cao" icon="resize-outline" info={height} text={plainText(heightStatus, latest.heightPercentile)} />
      </View>
      {latest?.suggestion ? <View style={{
      padding: 14,
      borderTopWidth: 1,
      borderTopColor: colors.borderSoft,
      backgroundColor: colors.surfaceSoft,
      flexDirection: 'row',
      gap: 8
    }}>
          <Ionicons name="flash-outline" size={14} color={colors.primary} style={{
        marginTop: 2
      }} />
          <Text style={{
        flex: 1,
        color: colors.text2,
        fontSize: 12,
        lineHeight: 19
      }}>{latest.suggestion}</Text>
        </View> : null}
    </View>;
}
function StatusCell({
  title,
  icon,
  info,
  text,
  bordered
}) {
  return <View style={{
    flex: 1,
    padding: 16,
    borderRightWidth: bordered ? 1 : 0,
    borderRightColor: colors.borderSoft
  }}>
      <Text style={{
      color: colors.hint,
      fontSize: 12
    }}><Ionicons name={icon} size={14} color={colors.hint} /> {title}</Text>
      <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 8
    }}>
        <View style={{
        width: 30,
        height: 30,
        borderRadius: 10,
        backgroundColor: info.bg,
        alignItems: 'center',
        justifyContent: 'center'
      }}>
          <Ionicons name={info.icon} size={15} color={info.color} />
        </View>
        <Text style={{
        flex: 1,
        color: info.color,
        fontSize: 13,
        fontWeight: '900'
      }}>{info.label}</Text>
      </View>
      <Text style={{
      marginTop: 8,
      color: info.color,
      fontSize: 11,
      lineHeight: 15
    }}>{text}</Text>
    </View>;
}
function MiniChart({
  history,
  tab
}) {
  const [width, setWidth] = useState(0);
  const chartHeight = 150;
  const pad = {
    top: 30,
    right: 30,
    bottom: 34,
    left: 30
  };
  const data = useMemo(() => [...history].filter(item => measurement(tab === 'weight' ? item.weightKg : item.heightCm) !== null && item.recordedAt && Number.isFinite(new Date(item.recordedAt).getTime())).sort((a, b) => new Date(a.recordedAt) - new Date(b.recordedAt)).slice(-8), [history, tab]);
  if (data.length < 2) {
    return <View style={[styles.card, {
      height: 110,
      alignItems: 'center',
      justifyContent: 'center'
    }]}>
        <Text style={{
        color: colors.hint,
        fontSize: 13
      }}>Cần ít nhất 2 lần đo để hiển thị biểu đồ</Text>
      </View>;
  }
  const values = data.map(item => Number(tab === 'weight' ? item.weightKg : item.heightCm));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const innerW = Math.max(width - pad.left - pad.right, 1);
  const innerH = chartHeight - pad.top - pad.bottom;
  const firstTime = new Date(data[0].recordedAt).getTime();
  const lastTime = new Date(data[data.length - 1].recordedAt).getTime();
  const points = data.map((item, index) => ({
    x: timePosition(new Date(item.recordedAt).getTime(), firstTime, lastTime, pad.left, innerW),
    y: pad.top + innerH - (values[index] - min) / range * innerH,
    value: values[index],
    date: formatDate(item.recordedAt).slice(0, 5)
  }));
  const segments = points.slice(0, -1).map((point, index) => {
    const next = points[index + 1];
    const dx = next.x - point.x;
    const dy = next.y - point.y;
    return {
      key: `${index}-${next.x}`,
      x: (point.x + next.x) / 2,
      y: (point.y + next.y) / 2,
      length: Math.sqrt(dx * dx + dy * dy),
      angle: `${Math.atan2(dy, dx) * 180 / Math.PI}deg`
    };
  });
  return <View style={[styles.card, {
    paddingVertical: 14,
    paddingHorizontal: 12
  }]}>
      <View onLayout={event => setWidth(event.nativeEvent.layout.width)} style={{
      height: chartHeight,
      borderRadius: 18,
      backgroundColor: '#FFF9FB',
      overflow: 'hidden'
    }}>
        {[0, 1, 2].map(line => <View key={line} style={{
        position: 'absolute',
        left: pad.left,
        right: pad.right,
        top: pad.top + line * (innerH / 2),
        height: 1,
        backgroundColor: '#F2E4EA'
      }} />)}
        {width > 0 ? <>
            {segments.map(segment => <View key={segment.key} style={{
          position: 'absolute',
          left: segment.x - segment.length / 2,
          top: segment.y - 1.5,
          width: segment.length,
          height: 3,
          borderRadius: 999,
          backgroundColor: colors.primary,
          transform: [{
            rotateZ: segment.angle
          }]
        }} />)}
            {points.map((point, index) => {
          const latest = index === points.length - 1;
          return <View key={`${point.date}-${index}`}>
                  <View style={{
              position: 'absolute',
              left: point.x - (latest ? 6 : 5),
              top: point.y - (latest ? 6 : 5),
              width: latest ? 12 : 10,
              height: latest ? 12 : 10,
              borderRadius: 999,
              backgroundColor: colors.primary,
              borderWidth: 2,
              borderColor: '#fff'
            }} />
                  {(latest || index === 0 && points[points.length - 1].x - point.x >= 56) && <Text style={{
              position: 'absolute',
              left: labelLeft(point.x, 52, width),
              top: chartHeight - 22,
              width: 52,
              textAlign: 'center',
              color: colors.hint,
              fontSize: 10,
              fontWeight: '700'
            }}>{point.date}</Text>}
                  {latest ? <Text style={{
              position: 'absolute',
              left: labelLeft(point.x, 60, width),
              top: Math.max(4, point.y - 24),
              width: 60,
              textAlign: 'center',
              color: colors.primary,
              fontSize: 11,
              fontWeight: '900'
            }}>{point.value.toFixed(1)}</Text> : null}
                </View>;
        })}
          </> : null}
      </View>
      <Text style={{
      textAlign: 'center',
      color: colors.hint,
      fontSize: 11,
      marginTop: 8
    }}>{formatDate(data[0].recordedAt)} – {formatDate(data[data.length - 1].recordedAt)} · {tab === 'weight' ? 'kg' : 'cm'}</Text>
    </View>;
}
function NutritionCard({
  item
}) {
  const high = item.priority === 'HIGH';
  return <View style={{
    width: 178,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: high ? '#FFB3C6' : colors.border
  }}>
      <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 8
    }}>
        <View style={{
        width: 40,
        height: 40,
        borderRadius: 13,
        backgroundColor: high ? colors.primaryLight : '#F6F7FB',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
          <Ionicons name="restaurant-outline" size={22} color={high ? colors.primary : '#687088'} />
        </View>
        <View style={{
        flex: 1,
        minWidth: 0
      }}>
          <Text numberOfLines={1} style={{
          color: colors.text,
          fontSize: 13,
          fontWeight: '900'
        }}>{item.name}</Text>
          <Text numberOfLines={1} style={{
          marginTop: 2,
          color: high ? colors.primary : colors.hint,
          fontSize: 11,
          fontWeight: '800'
        }}>{item.category}</Text>
        </View>
      </View>
      <Text numberOfLines={3} style={{
      color: colors.text2,
      fontSize: 11,
      lineHeight: 16
    }}>{item.reason}</Text>
      <Text numberOfLines={2} style={{
      marginTop: 7,
      color: colors.hint,
      fontSize: 10.5,
      lineHeight: 15
    }}>{item.servingNote}</Text>
    </View>;
}
function HistoryRow({
  item,
  tab,
  isLast
}) {
  const rawValue = tab === 'weight' ? item.weightKg : item.heightCm;
  const status = statusOf(measurement(rawValue) === null ? null : tab === 'weight' ? item.weightStatus : item.heightStatus);
  const value = measurementLabel(rawValue, tab === 'weight' ? 'kg' : 'cm');
  return <View style={{
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderBottomWidth: isLast ? 0 : 1,
    borderBottomColor: colors.borderSoft
  }}>
      <View style={{
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: status.bg,
      alignItems: 'center',
      justifyContent: 'center'
    }}>
        <Ionicons name={status.icon} size={16} color={status.color} />
      </View>
      <View style={{
      flex: 1
    }}>
        <Text style={{
        color: colors.text2,
        fontSize: 13
      }}>{formatDate(item.recordedAt)}</Text>
        <Text style={{
        marginTop: 2,
        color: status.color,
        fontSize: 11,
        fontWeight: '900'
      }}>{status.label}</Text>
      </View>
      <Text style={{
      flexShrink: 1,
      maxWidth: '48%',
      textAlign: 'right',
      color: colors.text,
      fontSize: 16,
      fontWeight: '900'
    }}>{value}</Text>
    </View>;
}
