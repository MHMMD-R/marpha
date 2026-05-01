const fs = require('fs');
const path = 'app/(tabs)/index.tsx';
let content = fs.readFileSync(path, 'utf8');

// The file is corrupted. The stats array at line 447 jumps directly to styles.
// We need to restore the missing section between stats and styles.

const missingSection = `            ].map((stat, i) => (
              <AnimatedStatCard key={stat.id} stat={stat} index={i} />
            ))}
          </View>

          {/* ─── Section Header ───────────────────── */}
          <Animated.View style={[styles.sectionHeader, {
            opacity: sectionAnim,
            transform: [{ translateY: sectionAnim.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
          }]}>
            <Text style={styles.sectionTitle}>محطات الطالب</Text>
            <TouchableOpacity activeOpacity={0.7}>
              <Text style={styles.seeAllText}>عرض الكل</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* ─── Stations Grid ─────────────────────── */}
          <View style={styles.stationsGrid}>
            {STATIONS.map((station, i) => {
              const displayStation = { ...station };
              if (displayStation.id === 'chat' && totalUnread > 0) {
                displayStation.badgeCount = totalUnread;
              }
              if (displayStation.id === 'notifications' && unreadNotifications > 0) {
                displayStation.badgeCount = unreadNotifications;
              }
              return (
              <AnimatedStationCard
                key={displayStation.id}
                station={displayStation}
                index={i}
                onPress={() => router.push(displayStation.route as any)}
              />
              );
            })}
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ═════════════════════════════════════════════════════════════════
// STYLES
// ═════════════════════════════════════════════════════════════════
const styles = StyleSheet.create({`;

// Find the broken point: the line ending with bg: '#F2F6F5' }, followed by `container:`
const lines = content.split('\n');
let breakIdx = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("'إنجاز'") && lines[i].includes("trophy-outline")) {
    breakIdx = i;
    break;
  }
}
console.log('Break point at line:', breakIdx + 1);

// Find where `container: { flex: 1` starts (the first style)
let styleIdx = -1;
for (let i = breakIdx + 1; i < lines.length; i++) {
  if (lines[i].trim().startsWith('container:')) {
    styleIdx = i;
    break;
  }
}
console.log('Style starts at line:', styleIdx + 1);

// Reconstruct: everything up to and including breakIdx line, then missingSection, then from styleIdx onward
const newLines = [];
for (let i = 0; i <= breakIdx; i++) {
  newLines.push(lines[i]);
}

missingSection.split('\n').forEach(l => newLines.push(l));

for (let i = styleIdx; i < lines.length; i++) {
  newLines.push(lines[i]);
}

fs.writeFileSync(path, newLines.join('\n'), 'utf8');
console.log('File restored! Total lines:', newLines.length);
